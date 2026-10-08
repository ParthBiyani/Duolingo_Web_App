"""Append-only ledgers (XP and gems) and the per-day activity summary.

``user_stats.xp_total`` and ``user_stats.gems`` are caches of these ledgers; every award writes
the ledger row and the cache in the same transaction, and a test checks that they agree.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal, get_args

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, text
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.models.base import Base, check_in, int_default, to_date

XpSource = Literal["lesson", "practice", "review", "legendary", "timed", "bot"]
GemReason = Literal[
    "seed",
    "goal_chest",
    "path_chest",
    "achievement",
    "league_reward",
    "heart_refill",
    "streak_freeze",
    "legendary_entry",
]
StreakStatus = Literal["none", "extended", "frozen"]


class XpEvent(Base):
    """One XP award. Rivals' XP is recorded here too, as one ``bot`` row per rival per day."""

    __tablename__ = "xp_events"
    __table_args__ = (
        check_in("source", get_args(XpSource)),
        CheckConstraint("amount > 0", name="amount_positive"),
        Index("ix_xp_events_user_date", "user_id", "local_date"),
        Index(
            "ux_xp_events_bot_day",
            "user_id",
            "local_date",
            unique=True,
            sqlite_where=text("source = 'bot'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    session_id: Mapped[str | None] = mapped_column(
        ForeignKey("sessions.id", ondelete="SET NULL"), unique=True
    )
    source: Mapped[XpSource] = mapped_column(Text)
    amount: Mapped[int]
    occurred_at: Mapped[datetime]
    local_date: Mapped[date]  # the learner's calendar day when it was earned

    @validates("local_date")
    def _coerce_local_date(self, _key: str, value: date | str) -> date:
        return to_date(value)


class GemTransaction(Base):
    """One change to a learner's gems, with the balance after it.

    A non-null ``ref`` names a one-off reward (``goal:2026-10-09``, ``achievement:sage:4``,
    ``chest:12``, ``league:2026-10-05``); a partial unique index makes paying it twice
    impossible.
    """

    __tablename__ = "gem_transactions"
    __table_args__ = (
        CheckConstraint("delta <> 0", name="delta_nonzero"),
        check_in("reason", get_args(GemReason)),
        CheckConstraint("balance_after >= 0", name="balance_after_min"),
        Index(
            "ux_gem_once",
            "user_id",
            "reason",
            "ref",
            unique=True,
            sqlite_where=text("ref IS NOT NULL"),
        ),
        Index("ix_gem_user_time", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    delta: Mapped[int]
    reason: Mapped[GemReason] = mapped_column(Text)
    ref: Mapped[str | None]
    balance_after: Mapped[int]
    created_at: Mapped[datetime]


class DailyActivity(Base):
    """A learner's activity on one local day: XP, completed sessions, goal and streak status."""

    __tablename__ = "daily_activity"
    __table_args__ = (check_in("streak_status", get_args(StreakStatus)),)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    local_date: Mapped[date] = mapped_column(primary_key=True)
    xp: Mapped[int] = mapped_column(server_default=int_default(0))
    sessions_completed: Mapped[int] = mapped_column(server_default=int_default(0))
    goal_xp: Mapped[int]  # the daily goal in force that day
    goal_met_at: Mapped[datetime | None]
    streak_status: Mapped[StreakStatus] = mapped_column(Text, server_default="none")

    @validates("local_date")
    def _coerce_local_date(self, _key: str, value: date | str) -> date:
        # Part of the primary key: a str here would not match the date the ORM loads back.
        return to_date(value)
