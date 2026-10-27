"""Create knowledge articles and immutable versions.
Revision ID: 71fa20261027
Revises: d5149ef3b2b4
"""
from alembic import op
import sqlalchemy as sa
revision = "71fa20261027"
down_revision = "d5149ef3b2b4"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("knowledge_articles",sa.Column("id",sa.UUID(),primary_key=True),sa.Column("title",sa.String(250),nullable=False),sa.Column("category",sa.String(100),nullable=False),sa.Column("status",sa.String(20),nullable=False),sa.Column("current_version",sa.Integer(),nullable=False),sa.Column("authorized_version",sa.Integer()),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False))
    op.create_index("ix_knowledge_articles_status","knowledge_articles",["status"])
    op.create_table("knowledge_versions",sa.Column("id",sa.UUID(),primary_key=True),sa.Column("article_id",sa.UUID(),sa.ForeignKey("knowledge_articles.id",ondelete="CASCADE"),nullable=False),sa.Column("number",sa.Integer(),nullable=False),sa.Column("content",sa.Text(),nullable=False),sa.Column("note",sa.String(500),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),sa.UniqueConstraint("article_id","number",name="uq_knowledge_version"))
    op.create_index("ix_knowledge_versions_article_id","knowledge_versions",["article_id"])

def downgrade():
    op.drop_index("ix_knowledge_versions_article_id",table_name="knowledge_versions")
    op.drop_table("knowledge_versions")
    op.drop_index("ix_knowledge_articles_status",table_name="knowledge_articles")
    op.drop_table("knowledge_articles")
