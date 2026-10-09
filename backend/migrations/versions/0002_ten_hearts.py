"""Raise the heart limit from 5 to 10.

Learners who were full stay full (5 becomes 10); learners who were missing hearts keep their
count and their regeneration clock. SQLite cannot change a CHECK constraint in place, so the
table is rebuilt in batch mode.

Revision ID: 0002
Revises: 0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _set_limit(new: int) -> None:
    with op.batch_alter_table("user_stats") as batch:
        batch.drop_constraint(op.f("ck_user_stats_hearts_range"), type_="check")
        batch.drop_constraint(op.f("ck_user_stats_hearts_anchor"), type_="check")
    # Full learners move to the new maximum; anyone at or above it is capped and full.
    op.execute(
        sa.text(
            "UPDATE user_stats SET hearts = :new, hearts_anchor_at = NULL "
            "WHERE hearts_anchor_at IS NULL OR hearts >= :new"
        ).bindparams(new=new)
    )
    with op.batch_alter_table("user_stats") as batch:
        batch.alter_column(
            "hearts",
            existing_type=sa.Integer(),
            server_default=sa.text(str(new)),
            existing_nullable=False,
        )
        batch.create_check_constraint(
            op.f("ck_user_stats_hearts_range"), f"hearts BETWEEN 0 AND {new}"
        )
        batch.create_check_constraint(
            op.f("ck_user_stats_hearts_anchor"), f"(hearts = {new}) = (hearts_anchor_at IS NULL)"
        )


def upgrade() -> None:
    _set_limit(10)


def downgrade() -> None:
    _set_limit(5)
