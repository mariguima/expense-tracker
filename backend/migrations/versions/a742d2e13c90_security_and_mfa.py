"""Add authenticator enrollment and enforce case-insensitive account uniqueness."""
from alembic import op
import sqlalchemy as sa

revision = "a742d2e13c90"
down_revision = "f63c91a02b7e"
branch_labels = None
depends_on = None


def upgrade():
    # Fail safely if old accounts collide; never merge or delete users automatically.
    connection = op.get_bind()
    collision = connection.execute(sa.text(
        "SELECT 1 FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1 LIMIT 1"
    )).first()
    if collision:
        raise RuntimeError("Resolve duplicate email addresses before applying this migration.")
    op.execute(sa.text("UPDATE users SET email = lower(trim(email))"))
    op.create_index("uq_users_email_normalized", "users", [sa.text("lower(email)")], unique=True)
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
    # Expire legacy browser-storage tokens during the cookie-session transition.
    op.execute(sa.text("UPDATE users SET token_version = token_version + 1"))


def downgrade():
    op.drop_table("mfa_recovery_codes")
    for column in ("mfa_enabled", "mfa_secret", "mfa_pending_secret", "mfa_pending_expires_at", "mfa_last_counter"):
        op.drop_column("users", column)
    op.drop_index("uq_users_email_normalized", table_name="users")
