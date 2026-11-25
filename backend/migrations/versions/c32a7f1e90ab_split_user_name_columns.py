"""split users.name into first_name and last_name

Revision ID: c32a7f1e90ab
Revises: 5b98f2c4d0f3
Create Date: 2026-11-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c32a7f1e90ab"
down_revision = "5b98f2c4d0f3"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("first_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=255), nullable=True))

    op.execute(sa.text("""
        UPDATE users
        SET first_name = CASE
                WHEN position(' ' in btrim(name)) = 0 THEN btrim(name)
                ELSE substring(btrim(name) from 1 for position(' ' in btrim(name)) - 1)
            END,
            last_name = CASE
                WHEN position(' ' in btrim(name)) = 0 THEN ''
                ELSE btrim(substring(btrim(name) from position(' ' in btrim(name)) + 1))
            END
    """))

    op.alter_column("users", "first_name", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("users", "last_name", existing_type=sa.String(length=255), nullable=False)
    op.drop_column("users", "name")


def downgrade():
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.execute(sa.text("""
        UPDATE users
        SET name = trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    """))
    op.alter_column("users", "name", existing_type=sa.String(length=255), nullable=False)
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
