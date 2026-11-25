"""Add single-use password reset tokens and session versioning."""
from alembic import op
import sqlalchemy as sa

revision = "f63c91a02b7e"
down_revision = "e42b1c7d9a10"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime()),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_table(
        "password_reset_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email_key", sa.String(64), nullable=False),
        sa.Column("ip_key", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_password_reset_requests_email_key", "password_reset_requests", ["email_key"])
    op.create_index("ix_password_reset_requests_ip_key", "password_reset_requests", ["ip_key"])
    op.create_index("ix_password_reset_requests_created_at", "password_reset_requests", ["created_at"])


def downgrade():
    op.drop_table("password_reset_requests")
    op.drop_table("password_reset_tokens")
    op.drop_column("users", "token_version")
