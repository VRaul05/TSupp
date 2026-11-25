"""AI/RAG invocation diagnostics without storing question or KB text.

Revision ID: a92c63e5b081
Revises: f37a21b9dc40
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "a92c63e5b081"
down_revision: Union[str, Sequence[str], None] = "f37a21b9dc40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_invocation",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("question_sha256", sa.String(64), nullable=False),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("embedding_model", sa.String(100), nullable=False),
        sa.Column("source_ids", JSONB, nullable=False),
        sa.Column("max_similarity", sa.Float, nullable=True),
        sa.Column("retrieval_min_similarity", sa.Float, nullable=False),
        sa.Column("abstained", sa.Boolean, nullable=False),
        sa.Column("reason", sa.String(80), nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=False),
        sa.Column("completion_tokens", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_ai_invocation_user_id", "ai_invocation", ["user_id"])
    op.create_index("ix_ai_invocation_created_at", "ai_invocation", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_invocation_created_at", table_name="ai_invocation")
    op.drop_index("ix_ai_invocation_user_id", table_name="ai_invocation")
    op.drop_table("ai_invocation")
