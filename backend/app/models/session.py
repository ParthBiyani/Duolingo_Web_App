"""Learning sessions (one run through a lesson or practice) and the answers given in them."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, get_args

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JSONText, check_in, int_default

SessionKind = Literal["lesson", "practice", "review", "legendary", "timed"]
SessionStatus = Literal["active", "completed", "failed", "abandoned"]
Outcome = Literal["correct", "typo", "incorrect", "skipped"]


class LessonSession(Base):
    """One run through a lesson, practice, review, legendary or timed session.

    The id is a UUID chosen by the client, so retrying a start is idempotent.
    """

    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint("length(id) = 36", name="id_length"),
        check_in("kind", get_args(SessionKind)),
        check_in("status", get_args(SessionStatus)),
        CheckConstraint("json_valid(plan)", name="plan_json"),
        CheckConstraint("result IS NULL OR json_valid(result)", name="result_json"),
        Index("ix_sessions_user_started", "user_id", "started_at"),
    )

    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[SessionKind] = mapped_column(Text)
    skill_id: Mapped[int | None] = mapped_column(
        ForeignKey("skills.id", ondelete="SET NULL"), index=True
    )
    lesson_id: Mapped[int | None] = mapped_column(
        ForeignKey("lessons.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[SessionStatus] = mapped_column(Text, server_default="active")
    plan: Mapped[list[int]] = mapped_column(JSONText)  # exercise ids in the order they are asked
    mistakes: Mapped[int] = mapped_column(server_default=int_default(0))
    hearts_lost: Mapped[int] = mapped_column(server_default=int_default(0))
    started_at: Mapped[datetime]
    ended_at: Mapped[datetime | None]
    # Completion summary, frozen so that completing again returns the same body.
    result: Mapped[dict[str, Any] | None] = mapped_column(JSONText)

    answers: Mapped[list[SessionAnswer]] = relationship(
        back_populates="session", order_by="SessionAnswer.id", passive_deletes=True
    )


class SessionAnswer(Base):
    """One graded answer. ``answer_id`` is a client UUID, so resubmitting replays the result."""

    __tablename__ = "session_answers"
    __table_args__ = (
        UniqueConstraint("session_id", "answer_id"),
        CheckConstraint("json_valid(answer)", name="answer_json"),
        check_in("outcome", get_args(Outcome)),
        Index("ix_session_answers_exercise", "session_id", "exercise_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    answer_id: Mapped[str]
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True
    )
    answer: Mapped[dict[str, Any]] = mapped_column(JSONText)  # the submitted answer as sent
    outcome: Mapped[Outcome] = mapped_column(Text)
    answered_at: Mapped[datetime]

    session: Mapped[LessonSession] = relationship(back_populates="answers")
