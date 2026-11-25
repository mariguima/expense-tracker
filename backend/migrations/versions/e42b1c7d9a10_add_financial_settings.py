"""add per-user financial settings

Revision ID: e42b1c7d9a10
Revises: c32a7f1e90ab
"""
from alembic import op
import sqlalchemy as sa


revision = "e42b1c7d9a10"
down_revision = "c32a7f1e90ab"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "financial_settings",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("monthly_budget", sa.Numeric(12, 2), nullable=False),
        sa.Column("monthly_savings_goal", sa.Numeric(12, 2), nullable=False),
        sa.Column("emergency_fund", sa.Numeric(12, 2), nullable=False),
        sa.Column("emergency_fund_target", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("warn_at_80", sa.Boolean(), nullable=False),
        sa.Column("round_amounts", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.execute(sa.text("""
        INSERT INTO financial_settings
            (user_id, monthly_budget, monthly_savings_goal, emergency_fund,
             emergency_fund_target, currency, warn_at_80, round_amounts)
        SELECT id, 2000.00, 225.00, 0.00, 5000.00, 'GBP', true, false FROM users
    """))


def downgrade():
    op.drop_table("financial_settings")
