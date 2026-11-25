"""TSupp KB models: document identity, immutable revisions, authorized vectors."""
from datetime import date, datetime
from uuid import UUID

from pgvector.sqlalchemy import VECTOR
from sqlalchemy import BigInteger, Boolean, CheckConstraint, Computed, Date, DateTime, ForeignKey, ForeignKeyConstraint, Identity, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class KbDocument(Base):
    __tablename__ = "kb_document"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    current_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    authorized_version: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    __table_args__ = (CheckConstraint("status IN ('draft','authorized','revoked')", name="ck_kb_document_status"),)


class KbDocumentVersion(Base):
    __tablename__ = "kb_document_version"
    document_id: Mapped[str] = mapped_column(String(50), ForeignKey("kb_document.id", ondelete="CASCADE"), primary_key=True)
    version_no: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(Text)
    roles_allowed: Mapped[list[str]] = mapped_column(ARRAY(String(20)), nullable=False)
    sensitivity: Mapped[str] = mapped_column(String(40), nullable=False, server_default="interna")
    language: Mapped[str] = mapped_column(String(10), nullable=False, server_default="es-MX")
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="'[]'::jsonb")
    source_procedure: Mapped[str | None] = mapped_column(Text)
    source_revision: Mapped[str | None] = mapped_column(String(40))
    source_review_date: Mapped[date | None] = mapped_column(Date)
    source_file: Mapped[str | None] = mapped_column(Text)
    content_md: Mapped[str] = mapped_column(Text, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id"))
    embedding_model: Mapped[str | None] = mapped_column(String(100))


class KbChunk(Base):
    __tablename__ = "kb_chunk"
    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), nullable=False)
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str] = mapped_column(Text, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    tsv: Mapped[str] = mapped_column(TSVECTOR, Computed("to_tsvector('spanish'::regconfig, text)", persisted=True))
    embedding: Mapped[list[float]] = mapped_column(VECTOR(1024), nullable=False)
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=False)
    __table_args__ = (
        ForeignKeyConstraint(["document_id", "version_no"], ["kb_document_version.document_id", "kb_document_version.version_no"], ondelete="CASCADE"),
        UniqueConstraint("document_id", "version_no", "ordinal", name="uq_kb_chunk_position"),
        Index("ix_kb_chunk_tsv", "tsv", postgresql_using="gin"),
        Index("ix_kb_chunk_vector_hnsw", "embedding", postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"}),
    )


class KbEvalQuestion(Base):
    __tablename__ = "kb_eval_question"
    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str | None] = mapped_column(Text)
    relevant_docs: Mapped[list] = mapped_column(JSONB, nullable=False)
    kind: Mapped[str] = mapped_column(String(50), nullable=False)
    should_answer: Mapped[bool] = mapped_column(Boolean, nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False)
    difficulty: Mapped[str | None] = mapped_column(String(30))
    keywords: Mapped[list] = mapped_column(JSONB, nullable=False)
    dataset_version: Mapped[str] = mapped_column(String(30), nullable=False)
