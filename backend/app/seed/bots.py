"""League rivals: 29 simulated learners who fill each sample learner's weekly cohort.

Rivals are ordinary ``users`` rows with ``is_bot`` set and a weekly XP pace. Their XP is not
stored up front: the leaderboard adds one ``bot`` XP event per rival per elapsed day when it is
read (``app.domain.leagues.bot_day_xp``), so the table fills in as simulated time passes. The
same rivals make up every learner's cohort, as they do for the cohorts the app forms each new
week (``app.services.leagues.ensure_cohort``).
"""

import random
import unicodedata
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy.orm import Session

from app.domain.dates import local_date, local_midnight_utc, week_start
from app.models import LeagueCohort, LeagueMembership, User

# Fictional first names with a last initial.
RIVAL_NAMES = (
    ("Maya", "R"), ("Liam", "K"), ("Sofia", "M"), ("Arjun", "S"), ("Chloe", "B"),
    ("Mateo", "G"), ("Aisha", "N"), ("Noah", "W"), ("Elena", "P"), ("Kenji", "T"),
    ("Priya", "D"), ("Lucas", "F"), ("Zara", "H"), ("Omar", "A"), ("Hana", "Y"),
    ("Diego", "L"), ("Leila", "C"), ("Ethan", "J"), ("Nadia", "V"), ("Ravi", "E"),
    ("Isla", "O"), ("Tomás", "Q"), ("Mei", "Z"), ("Samuel", "I"), ("Freya", "U"),
    ("Kofi", "X"), ("Lena", "R"), ("Yusuf", "B"), ("Inés", "M"),
)  # fmt: skip

AVATAR_COLORS = (
    "#58CC02", "#CE82FF", "#FF9600", "#FF4B4B", "#1CB0F6",
    "#FFC800", "#2B70C9", "#FF86D0", "#00CD9C", "#A568CC",
)  # fmt: skip

# Weekly XP paces between 40 and 600. Eleven rivals out-pace the default learner's usual
# 250-300 XP a week and eighteen do not, which puts the learner around 12th of 30.
RIVAL_PACES = (
    40, 50, 60, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 175, 185, 195, 205, 215,
    320, 340, 360, 380, 400, 430, 460, 490, 520, 560, 600,
)  # fmt: skip


def seed_rivals(session: Session, learner: User, now: datetime) -> list[User]:
    """Create the 29 rivals, as if they joined when this week began in ``learner``'s time zone."""
    week_began = local_midnight_utc(week_start(local_date(now, learner.timezone)), learner.timezone)
    paces = list(RIVAL_PACES)
    random.Random("league-rivals").shuffle(paces)  # so a rival's name says nothing about pace
    rivals = [
        User(
            username=_username(first_name, initial),
            display_name=f"{first_name} {initial}.",
            avatar_color=AVATAR_COLORS[index % len(AVATAR_COLORS)],
            timezone=learner.timezone,
            is_bot=True,
            bot_pace_xp=pace,
            current_course_id=learner.current_course_id,
            created_at=week_began,
        )
        for index, ((first_name, initial), pace) in enumerate(zip(RIVAL_NAMES, paces, strict=True))
    ]
    session.add_all(rivals)
    session.flush()  # assigns the ids the memberships refer to
    return rivals


def seed_league_week(
    session: Session, learner: User, rivals: Sequence[User], now: datetime, tier: int
) -> LeagueCohort:
    """Create this week's cohort at ``tier`` with the learner and the rivals.

    Every learner gets a cohort of their own, so each week is finalised (ranks, prizes and the
    next tier) for exactly one learner, as ``app.services.leagues`` expects.
    """
    week = week_start(local_date(now, learner.timezone))
    # Everyone has been in the cohort since the week began, in the learner's time zone.
    week_began = local_midnight_utc(week, learner.timezone)
    cohort = LeagueCohort(tier=tier, week_start=week)
    session.add(cohort)
    session.flush()  # assigns the cohort id
    session.add_all(
        LeagueMembership(cohort_id=cohort.id, user_id=member.id, joined_at=week_began)
        for member in (learner, *rivals)
    )
    session.flush()
    return cohort


def _username(first_name: str, initial: str) -> str:
    """``Tomás``, ``Q`` -> ``tomas_q``: lowercase ASCII, accents dropped."""
    plain = unicodedata.normalize("NFKD", first_name).encode("ascii", "ignore").decode()
    return f"{plain}_{initial}".lower()
