"""Learners and their per-learner state: settings, cached stats and progress per path node."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.models.base import Base, check_bool, check_in, int_default, to_date

if TYPE_CHECKING:
    from app.models.content import Course

Theme = Literal["system", "light", "dark"]
DailyGoal = Literal[1, 10, 20, 30, 50]


class User(Base):
    """A learner. League rivals are users too: ``is_bot`` with a weekly XP pace.

    Only real learners have ``settings`` and ``stats`` rows; rivals have neither.
    """

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(username) BETWEEN 3 AND 30", name="username_length"),
        check_bool("is_bot"),
        CheckConstraint("(is_bot = 1) = (bot_pace_xp IS NOT NULL)", name="bot_pace_for_bots"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    display_name: Mapped[str]
    avatar_color: Mapped[str]
    timezone: Mapped[str] = mapped_column(server_default="UTC")
    is_bot: Mapped[bool] = mapped_column(server_default=int_default(0))
    bot_pace_xp: Mapped[int | None]  # rivals only: average XP per week
    current_course_id: Mapped[int | None] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime]

    current_course: Mapped[Course | None] = relationship()
    settings: Mapped[UserSettings] = relationship(
        back_populates="user", uselist=False, passive_deletes=True
    )
    stats: Mapped[UserStats] = relationship(
        back_populates="user", uselist=False, passive_deletes=True
    )


class UserSettings(Base):
    __tablename__ = "user_settings"
    __table_args__ = (
        check_bool("sound_effects"),
        check_bool("animations"),
        check_bool("motivational_messages"),
        check_bool("listening_exercises"),
        check_in("theme", get_args(Theme)),
        check_in("daily_goal_xp", get_args(DailyGoal)),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    sound_effects: Mapped[bool] = mapped_column(server_default=int_default(1))
    animations: Mapped[bool] = mapped_column(server_default=int_default(1))
    motivational_messages: Mapped[bool] = mapped_column(server_default=int_default(1))
    listening_exercises: Mapped[bool] = mapped_column(server_default=int_default(1))
    theme: Mapped[Theme] = mapped_column(Text, server_default="system")
    daily_goal_xp: Mapped[DailyGoal] = mapped_column(Integer, server_default=int_default(20))

    user: Mapped[User] = relationship(back_populates="settings")


class UserStats(Base):
    """Counters for one learner. ``xp_total`` and ``gems`` cache the sums of their ledgers
    (``xp_events`` and ``gem_transactions``) and are written in the same transaction."""

    __tablename__ = "user_stats"
    __table_args__ = (
        CheckConstraint("xp_total >= 0", name="xp_total_min"),
        CheckConstraint("gems >= 0", name="gems_min"),
        CheckConstraint("hearts BETWEEN 0 AND 5", name="hearts_range"),
        CheckConstraint("streak_current >= 0", name="streak_current_min"),
        CheckConstraint("streak_freezes BETWEEN 0 AND 2", name="streak_freezes_range"),
        # The regeneration clock runs exactly while hearts are missing.
        CheckConstraint("(hearts = 5) = (hearts_anchor_at IS NULL)", name="hearts_anchor"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    xp_total: Mapped[int] = mapped_column(server_default=int_default(0))
    gems: Mapped[int] = mapped_column(server_default=int_default(0))
    hearts: Mapped[int] = mapped_column(server_default=int_default(5))
    hearts_anchor_at: Mapped[datetime | None]
    streak_current: Mapped[int] = mapped_column(server_default=int_default(0))
    streak_longest: Mapped[int] = mapped_column(server_default=int_default(0))
    streak_last_date: Mapped[date | None]
    streak_freezes: Mapped[int] = mapped_column(server_default=int_default(0))
    lessons_completed: Mapped[int] = mapped_column(server_default=int_default(0))
    perfect_lessons: Mapped[int] = mapped_column(server_default=int_default(0))
    legendary_skills: Mapped[int] = mapped_column(server_default=int_default(0))
    top3_finishes: Mapped[int] = mapped_column(server_default=int_default(0))
    league_tier: Mapped[int] = mapped_column(
        ForeignKey("leagues.tier", ondelete="RESTRICT"), index=True, server_default=int_default(0)
    )

    user: Mapped[User] = relationship(back_populates="stats")

    @validates("streak_last_date")
    def _coerce_streak_last_date(self, _key: str, value: date | str | None) -> date | None:
        return None if value is None else to_date(value)


class SkillProgress(Base):
    """A learner's progress on one path node (lessons done, crowns, chest claimed)."""

    __tablename__ = "skill_progress"
    __table_args__ = (
        CheckConstraint("lessons_completed >= 0", name="lessons_completed_min"),
        CheckConstraint("crown_level BETWEEN 0 AND 2", name="crown_level_range"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    lessons_completed: Mapped[int] = mapped_column(server_default=int_default(0))
    crown_level: Mapped[int] = mapped_column(server_default=int_default(0))
    completed_at: Mapped[datetime | None]  # for a chest node: when it was claimed
    legendary_at: Mapped[datetime | None]
