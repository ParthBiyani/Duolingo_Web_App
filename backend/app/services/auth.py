"""Logging in as one of the sample learners (docs/adr/0003)."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.domain.leagues import get_tier
from app.domain.streak import settle_streak
from app.models import User
from app.schemas.auth import SampleLearner
from app.services.common import streak_state, today_for
from app.services.path import load_path


def list_learners(db: Session, now: datetime) -> list[SampleLearner]:
    """Every learner who can log in, in the order they were seeded."""
    learners = db.scalars(select(User).where(User.is_bot.is_(False)).order_by(User.id)).all()
    return [sample_learner(db, now, user) for user in learners]


def find_learner(db: Session, username: str) -> User:
    user = db.scalar(select(User).where(User.username == username, User.is_bot.is_(False)))
    if user is None:
        raise AppError(404, "learner_not_found", "Not found", f"There is no learner {username!r}.")
    return user


def sample_learner(db: Session, now: datetime, user: User) -> SampleLearner:
    """Summarise a learner for the login page without changing any stored state."""
    stats = user.stats
    # The streak as it stands today: one that missed a day without a freeze shows as 0.
    streak = settle_streak(streak_state(stats), today_for(user, now)).state.current
    snapshot = load_path(db, user)
    unit = next(
        (
            unit
            for unit in snapshot.units
            if any(snapshot.states[skill.id].state == "active" for skill in unit.skills)
        ),
        snapshot.units[-1],  # the whole course is complete
    )
    return SampleLearner(
        username=user.username,
        display_name=user.display_name,
        avatar_color=user.avatar_color,
        initials=initials(user.display_name),
        xp_total=stats.xp_total,
        streak=streak,
        unit_number=unit.position,
        unit_title=unit.title,
        league_name=get_tier(stats.league_tier).name,
    )


def initials(display_name: str) -> str:
    """``"Parth Biyani"`` -> ``"PB"``; a single name gives one letter."""
    words = display_name.split()
    return "".join(word[0] for word in words[:1] + words[1:][-1:]).upper()
