"""Weekly leagues: the ten tiers, the weekly cohorts of 30 and who is in each cohort."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import Base, JSONText, check_bool, check_in, int_default, to_date

if TYPE_CHECKING:
    from app.models.learner import User

MembershipOutcome = Literal["promoted", "stayed", "demoted"]


class League(Base):
    __tablename__ = "leagues"
    __table_args__ = (
        CheckConstraint("tier BETWEEN 0 AND 9", name="tier_range"),
        CheckConstraint("json_valid(reward_gems)", name="reward_gems_json"),
    )

    # 0 is Bronze and 9 is Diamond; the numbers are fixed, never generated.
    tier: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(unique=True)
    color: Mapped[str]
    promote_count: Mapped[int]
    demote_count: Mapped[int]
    reward_gems: Mapped[list[int]] = mapped_column(JSONText)  # gems for 1st, 2nd and 3rd place


class LeagueCohort(Base):
    """One league group for one week (Monday to Monday in the learner's time zone)."""

    __tablename__ = "league_cohorts"
    __table_args__ = (Index("ix_cohorts_week", "week_start", "tier"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tier: Mapped[int] = mapped_column(ForeignKey("leagues.tier", ondelete="RESTRICT"), index=True)
    week_start: Mapped[date]
    finalized_at: Mapped[datetime | None]

    league: Mapped[League] = relationship()
    memberships: Mapped[list[LeagueMembership]] = relationship(
        back_populates="cohort", passive_deletes=True
    )

    @validates("week_start")
    def _coerce_week_start(self, _key: str, value: date | str) -> date:
        return to_date(value)


class LeagueMembership(Base):
    __tablename__ = "league_memberships"
    __table_args__ = (
        check_in("outcome", get_args(MembershipOutcome)),
        check_bool("result_seen"),
        Index("ix_memberships_user", "user_id"),
    )

    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("league_cohorts.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    joined_at: Mapped[datetime]
    final_rank: Mapped[int | None]  # set when the week is finalised
    outcome: Mapped[MembershipOutcome | None] = mapped_column(Text)
    result_seen: Mapped[bool] = mapped_column(server_default=int_default(0))

    cohort: Mapped[LeagueCohort] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship()
