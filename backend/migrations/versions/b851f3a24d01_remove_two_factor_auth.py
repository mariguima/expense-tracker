"""Remove two-factor enrollment and recovery codes at the product owner's request."""
from alembic import op
import sqlalchemy as sa

revision = "b851f3a24d01"
down_revision = "a742d2e13c90"
branch_labels = None
depends_on = None


def upgrade():
    # End sessions for previously enrolled accounts before removing their second factor.
    op.execute(sa.text("UPDATE users SET token_version = token_version + 1 WHERE mfa_enabled = true"))
    op.drop_table("mfa_recovery_codes")
    for column in ("mfa_enabled", "mfa_secret", "mfa_pending_secret", "mfa_pending_expires_at", "mfa_last_counter"):
        op.drop_column("users", column)


def downgrade():
    # Restoring the schema cannot restore old authenticator secrets or recovery codes.
    op.add_column("users", sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("mfa_secret", sa.Text()))
    op.add_column("users", sa.Column("mfa_pending_secret", sa.Text()))
    op.add_column("users", sa.Column("mfa_pending_expires_at", sa.DateTime()))
    op.add_column("users", sa.Column("mfa_last_counter", sa.BigInteger(), nullable=False, server_default="-1"))
    op.create_table("mfa_recovery_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_mfa_recovery_codes_user_id", "mfa_recovery_codes", ["user_id"])
