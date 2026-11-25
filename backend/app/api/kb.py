"""KB read and supervisor-only authorization API for RAG foundation.

Does NOT generate LLM answers, execute actions or expose unapproved content to staff.
"""
from __future__ import annotations

from datetime import datetime, timezone
import os
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select, text

from app.api.deps import CurrentUser, Db, require_roles
from app.models.auth import AuditEvent
from app.models.kb import KbChunk, KbDocument, KbDocumentVersion
from app.models.user import User
from app.services.kb_processing import ROLE_MAP, embed_texts, split_version

router = APIRouter(prefix="/api/kb", tags=["Knowledge Base"])
Supervisor = Annotated[User, Depends(require_roles("supervisor"))]


def _overview(doc: KbDocument, version: KbDocumentVersion) -> dict:
    return {
        "id": doc.id,
        "title": version.title,
        "category": version.category,
        "subcategory": version.subcategory,
        "status": doc.status,
        "current_version": doc.current_version,
        "authorized_version": doc.authorized_version,
        "displayed_version": version.version_no,
        "roles_allowed": version.roles_allowed,
        "source_file": version.source_file,
        "source_revision": version.source_revision,
        "source_review_date": version.source_review_date,
        "approved_at": version.approved_at,
    }


@router.get("/documentos")
def list_documents(db: Db, user: CurrentUser):
    role = ROLE_MAP.get(user.role)
    if role is None:
        raise HTTPException(403, "Invalid role")
    docs = db.scalars(select(KbDocument).order_by(KbDocument.id)).all()
    result = []
    for doc in docs:
        # Employees never see draft versions or metadata.
        version_no = doc.authorized_version if user.role == "employee" else doc.current_version
        if version_no is None or (user.role == "employee" and doc.status != "authorized"):
            continue
        version = db.get(KbDocumentVersion, (doc.id, version_no))
        if version is None:
            continue
        if user.role == "employee" and role not in version.roles_allowed:
            continue
        result.append(_overview(doc, version))
    return result


@router.get("/documentos/{document_id}/versiones/{version_no}")
def get_document_version(document_id: str, version_no: int, db: Db, user: CurrentUser):
    doc = db.get(KbDocument, document_id)
    version = db.get(KbDocumentVersion, (document_id, version_no))
    if doc is None or version is None:
        raise HTTPException(404, "Document not found")
    role = ROLE_MAP.get(user.role)
    if role is None:
        raise HTTPException(403, "Invalid role")
    # The public/employee path is restricted to the exact authorized revision.
    if user.role == "employee" and not (
        doc.status == "authorized" and doc.authorized_version == version_no
        and version.approved_at is not None and role in version.roles_allowed
    ):
        raise HTTPException(404, "Document not found")
    return {**_overview(doc, version), "content_md": version.content_md}


@router.post("/documentos/{document_id}/autorizar")
def authorize_document(document_id: str, db: Db, supervisor: Supervisor):
    """Supervisor review is an explicit decision; vectors only exist after this approval."""
    doc = db.scalar(select(KbDocument).where(KbDocument.id == document_id).with_for_update())
    if doc is None:
        raise HTTPException(404, "Document not found")
    version = db.get(KbDocumentVersion, (document_id, doc.current_version))
    if version is None:
        raise HTTPException(409, "Document version missing")
    if (doc.status == "authorized" and doc.authorized_version == version.version_no
            and version.embedding_model == os.getenv("TSUPP_EMBED_MODEL", "bge-m3")):
        n = db.scalar(select(func.count(KbChunk.id)).where(
            KbChunk.document_id == doc.id, KbChunk.version_no == version.version_no
        ))
        if n:
            return {"id": doc.id, "version": version.version_no, "chunks": n, "already_authorized": True}

    pieces = split_version(version.title, version.content_md)
    try:
        vectors, model = embed_texts([part for _, part in pieces])
    except (httpx.HTTPError, RuntimeError, ValueError) as exc:
        db.rollback()
        raise HTTPException(503, "Ollama embeddings unavailable or invalid; no changes committed") from exc

    db.execute(delete(KbChunk).where(KbChunk.document_id == doc.id, KbChunk.version_no == version.version_no))
    for i, ((section, content), vector) in enumerate(zip(pieces, vectors)):
        db.add(KbChunk(document_id=doc.id, version_no=version.version_no,
                       ordinal=i, section=section, text=content,
                       embedding=vector, embedding_model=model))
    doc.authorized_version = version.version_no
    doc.status = "authorized"
    doc.updated_at = datetime.now(timezone.utc)
    version.approved_by = supervisor.id
    version.approved_at = datetime.now(timezone.utc)
    version.embedding_model = model
    db.add(AuditEvent(actor_id=supervisor.id, action="kb.document_authorized", target=doc.id))
    db.commit()
    return {"id": doc.id, "version": version.version_no, "chunks": len(pieces), "model": model}


@router.post("/documentos/{document_id}/revocar")
def revoke_document(document_id: str, db: Db, supervisor: Supervisor):
    doc = db.scalar(select(KbDocument).where(KbDocument.id == document_id).with_for_update())
    if doc is None:
        raise HTTPException(404, "Document not found")
    doc.status = "revoked"
    doc.authorized_version = None
    doc.updated_at = datetime.now(timezone.utc)
    db.add(AuditEvent(actor_id=supervisor.id, action="kb.document_revoked", target=doc.id))
    db.commit()
    return {"id": doc.id, "status": "revoked"}


@router.get("/buscar")
def search_authorized(
    db: Db,
    user: CurrentUser,
    q: str = Query(min_length=4, max_length=500),
    limit: int = Query(default=5, ge=1, le=10),
):
    """Diagnostic semantic retrieval; *not* an AI answer or confidence guarantee."""
    role = ROLE_MAP.get(user.role)
    if role is None:
        raise HTTPException(403, "Invalid role")
    try:
        vectors, model = embed_texts([q])
    except (httpx.HTTPError, RuntimeError, ValueError) as exc:
        raise HTTPException(503, "Ollama embeddings unavailable or invalid") from exc
    # SQL-level RBAC; draft/unapproved/revoked revisions never enter result set.
    # All externally supplied values are bound parameters.
    query = text("""
        SELECT c.document_id, c.version_no, c.section, c.text AS fragment,
               v.title, v.category, v.source_file, v.source_revision,
               1 - (c.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM kb_chunk c
        JOIN kb_document d ON d.id = c.document_id
        JOIN kb_document_version v
          ON v.document_id = c.document_id AND v.version_no = c.version_no
        WHERE d.status = 'authorized'
          AND d.authorized_version = c.version_no
          AND v.approved_at IS NOT NULL
          AND :role = ANY(v.roles_allowed)
          AND c.embedding_model = :model
        ORDER BY c.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
    """)
    embedding = "[" + ",".join(str(x) for x in vectors[0]) + "]"
    rows = db.execute(query, {"embedding": embedding, "role": role, "model": model, "limit": limit}).mappings().all()
    return {
        "query": q,
        "embedding_model": model,
        "diagnostic_only": True,
        "results": [
            {
                "document_id": row["document_id"], "version": row["version_no"],
                "title": row["title"], "section": row["section"], "fragment": row["fragment"],
                "source_file": row["source_file"], "source_revision": row["source_revision"],
                "similarity": round(float(row["similarity"]), 5),
                "source_url": f"/api/kb/documentos/{row['document_id']}/versiones/{row['version_no']}",
            }
            for row in rows
        ],
    }
