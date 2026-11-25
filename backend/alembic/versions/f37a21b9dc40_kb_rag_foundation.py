"""Knowledge Base versioned documents, authorized retrieval, 1024-d embeddings.

Revision ID: f37a21b9dc40
Revises: c2a90610db15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from pgvector.sqlalchemy import VECTOR

revision: str = "f37a21b9dc40"
down_revision: Union[str, Sequence[str], None] = "c2a90610db15"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "kb_document",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("current_version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("authorized_version", sa.Integer, nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("status IN ('draft','authorized','revoked')", name="ck_kb_document_status"),
    )
    op.create_table(
        "kb_document_version",
        sa.Column("document_id", sa.String(50), sa.ForeignKey("kb_document.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("version_no", sa.Integer, primary_key=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("category", sa.String(60), nullable=False),
        sa.Column("subcategory", sa.Text, nullable=True),
        sa.Column("roles_allowed", ARRAY(sa.String(20)), nullable=False),
        sa.Column("sensitivity", sa.String(40), nullable=False, server_default="interna"),
        sa.Column("language", sa.String(10), nullable=False, server_default="es-MX"),
        sa.Column("tags", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("source_procedure", sa.Text, nullable=True),
        sa.Column("source_revision", sa.String(40), nullable=True),
        sa.Column("source_review_date", sa.Date, nullable=True),
        sa.Column("source_file", sa.Text, nullable=True),
        sa.Column("content_md", sa.Text, nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("embedding_model", sa.String(100), nullable=True),
    )
    op.create_table(
        "kb_chunk",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("document_id", sa.String(50), nullable=False),
        sa.Column("version_no", sa.Integer, nullable=False),
        sa.Column("ordinal", sa.Integer, nullable=False),
        sa.Column("section", sa.Text, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("tsv", sa.dialects.postgresql.TSVECTOR(), sa.Computed("to_tsvector('spanish'::regconfig, text)", persisted=True)),
        sa.Column("embedding", VECTOR(1024), nullable=False),
        sa.Column("embedding_model", sa.String(100), nullable=False),
        sa.ForeignKeyConstraint(["document_id", "version_no"], ["kb_document_version.document_id", "kb_document_version.version_no"], ondelete="CASCADE"),
        sa.UniqueConstraint("document_id", "version_no", "ordinal", name="uq_kb_chunk_position"),
    )
    op.create_index("ix_kb_chunk_tsv", "kb_chunk", ["tsv"], postgresql_using="gin")
    op.create_index("ix_kb_chunk_vector_hnsw", "kb_chunk", ["embedding"], postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"})
    op.create_table(
        "kb_eval_question",
        sa.Column("id", sa.String(30), primary_key=True),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("expected_answer", sa.Text, nullable=True),
        sa.Column("relevant_docs", JSONB, nullable=False),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("should_answer", sa.Boolean, nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("difficulty", sa.String(30), nullable=True),
        sa.Column("keywords", JSONB, nullable=False),
        sa.Column("dataset_version", sa.String(30), nullable=False),
    )


def downgrade() -> None:
    # Deliberately preserves the pgvector extension; it may be used by other modules.
    op.drop_table("kb_eval_question")
    op.drop_index("ix_kb_chunk_vector_hnsw", table_name="kb_chunk")
    op.drop_index("ix_kb_chunk_tsv", table_name="kb_chunk")
    op.drop_table("kb_chunk")
    op.drop_table("kb_document_version")
    op.drop_table("kb_document")
