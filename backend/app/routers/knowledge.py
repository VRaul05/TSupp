
"""Knowledge Base API protegida con JWT y permisos por rol."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_db,
    require_agent,
    require_supervisor,
)
from app.models.knowledge import KnowledgeArticle, KnowledgeVersion
from app.models.user import User


router = APIRouter(
    prefix="/api/knowledge",
    tags=["knowledge"],
)


# =============================
# Esquemas
# =============================

class ArticleInput(BaseModel):
    title: str = Field(min_length=1, max_length=250)
    category: str = Field(default="General", min_length=1, max_length=100)
    content: str = Field(min_length=1)
    note: str = Field(default="", max_length=500)


class EditInput(BaseModel):
    content: str = Field(min_length=1)
    note: str = Field(default="", max_length=500)
    title: str | None = Field(default=None, min_length=1, max_length=250)


class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    number: int
    content: str
    note: str
    created_at: datetime


class ArticleOut(BaseModel):
    id: UUID
    title: str
    category: str
    status: str
    current_version: int
    authorized_version: int | None
    content: str


# =============================
# Funciones auxiliares
# =============================

def get_article(db: Session, id: UUID) -> KnowledgeArticle:
    article = db.get(KnowledgeArticle, id)

    if article is None:
        raise HTTPException(
            status_code=404,
            detail="Article not found",
        )

    return article


def serial(
    db: Session,
    article: KnowledgeArticle,
    public: bool = False,
) -> ArticleOut:
    number = (
        article.authorized_version
        if public
        else article.current_version
    )

    version = db.scalar(
        select(KnowledgeVersion).where(
            KnowledgeVersion.article_id == article.id,
            KnowledgeVersion.number == number,
        )
    )

    if version is None:
        raise HTTPException(
            status_code=404,
            detail="Version not found",
        )

    return ArticleOut(
        id=article.id,
        title=article.title,
        category=article.category,
        status=article.status,
        current_version=article.current_version,
        authorized_version=article.authorized_version,
        content=version.content,
    )


# =============================
# Endpoints públicos
# =============================

@router.get("/public", response_model=list[ArticleOut])
def public_search(
    q: str = "",
    db: Session = Depends(get_db),
):
    stmt = select(KnowledgeArticle).where(
        KnowledgeArticle.status == "authorized",
        KnowledgeArticle.authorized_version.is_not(None),
    )

    if q.strip():
        stmt = stmt.where(
            KnowledgeArticle.title.ilike(f"%{q.strip()}%")
        )

    articles = db.scalars(stmt).all()

    return [
        serial(db, article, public=True)
        for article in articles
    ]


@router.get("/public/{id}", response_model=ArticleOut)
def public_article(
    id: UUID,
    db: Session = Depends(get_db),
):
    article = get_article(db, id)

    if (
        article.status != "authorized"
        or article.authorized_version is None
    ):
        raise HTTPException(
            status_code=404,
            detail="Article not found",
        )

    return serial(db, article, public=True)


# =============================
# Consultas internas
# =============================

@router.get("", response_model=list[ArticleOut])
def list_all(
    db: Session = Depends(get_db),
    user: User = Depends(require_agent),
):
    articles = db.scalars(
        select(KnowledgeArticle)
    ).all()

    return [serial(db, article) for article in articles]


@router.get("/{id}", response_model=ArticleOut)
def detail(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_agent),
):
    return serial(db, get_article(db, id))


# =============================
# Crear y editar documentos
# =============================

@router.post("", response_model=ArticleOut, status_code=201)
def create(
    data: ArticleInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_agent),
):
    article = KnowledgeArticle(
        title=data.title,
        category=data.category,
        status="draft",
        current_version=1,
    )

    db.add(article)
    db.flush()

    version = KnowledgeVersion(
        article_id=article.id,
        number=1,
        content=data.content,
        note=data.note,
    )

    db.add(version)
    db.commit()

    return serial(db, article)


@router.put("/{id}", response_model=ArticleOut)
def edit(
    id: UUID,
    data: EditInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_agent),
):
    article = get_article(db, id)

    if data.title is not None:
        article.title = data.title

    article.current_version += 1

    # Toda edición requiere una nueva autorización.
    article.status = "draft"
    article.authorized_version = None

    db.add(
        KnowledgeVersion(
            article_id=article.id,
            number=article.current_version,
            content=data.content,
            note=data.note,
        )
    )

    db.commit()

    return serial(db, article)


# =============================
# Historial de versiones
# =============================

@router.get(
    "/{id}/versions",
    response_model=list[VersionOut],
)
def versions(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_agent),
):
    get_article(db, id)

    return db.scalars(
        select(KnowledgeVersion)
        .where(KnowledgeVersion.article_id == id)
        .order_by(KnowledgeVersion.number.desc())
    ).all()


@router.post(
    "/{id}/restore/{version}",
    response_model=ArticleOut,
)
def restore(
    id: UUID,
    version: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_supervisor),
):
    article = get_article(db, id)

    old_version = db.scalar(
        select(KnowledgeVersion).where(
            KnowledgeVersion.article_id == id,
            KnowledgeVersion.number == version,
        )
    )

    if old_version is None:
        raise HTTPException(
            status_code=404,
            detail="Version not found",
        )

    article.current_version += 1
    article.status = "draft"
    article.authorized_version = None

    db.add(
        KnowledgeVersion(
            article_id=id,
            number=article.current_version,
            content=old_version.content,
            note=f"Restored from version {version}",
        )
    )

    db.commit()

    return serial(db, article)


# =============================
# Ciclo documental
# =============================

@router.post("/{id}/submit", response_model=ArticleOut)
def submit(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_agent),
):
    article = get_article(db, id)

    if article.status != "draft":
        raise HTTPException(
            status_code=409,
            detail="Only drafts can be submitted",
        )

    article.status = "under_review"

    db.commit()

    return serial(db, article)


@router.post("/{id}/authorize", response_model=ArticleOut)
def authorize(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_supervisor),
):
    article = get_article(db, id)

    if article.status != "under_review":
        raise HTTPException(
            status_code=409,
            detail="Submit article for review first",
        )

    article.status = "authorized"
    article.authorized_version = article.current_version

    db.commit()

    return serial(db, article)


@router.post("/{id}/revoke", response_model=ArticleOut)
def revoke(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_supervisor),
):
    article = get_article(db, id)

    if article.status != "authorized":
        raise HTTPException(
            status_code=409,
            detail="Only authorized articles may be revoked",
        )

    article.status = "revoked"
    article.authorized_version = None

    db.commit()

    return serial(db, article)


# =============================
# Eliminar documentos
# =============================

@router.delete("/{id}", status_code=204)
def delete(
    id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_supervisor),
):
    article = get_article(db, id)

    db.delete(article)
    db.commit()
