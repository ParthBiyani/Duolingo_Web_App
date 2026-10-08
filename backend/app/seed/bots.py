"""League rivals: 29 simulated learners who share the default learner's weekly cohort.

Rivals are ordinary ``users`` rows with ``is_bot`` set and a weekly XP pace. Their XP is not
stored up front: the leaderboard adds one ``bot`` XP event per rival per elapsed day when it is
read (``app.domain.leagues.bot_day_xp``), so the table fills in as simulated time passes.
"""

import random
import unicodedata
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


def seed_league_week(session: Session, learner: User, now: datetime, tier: int) -> LeagueCohort:
    """Create this week's cohort at ``tier`` with the learner and the 29 rivals."""
    week = week_start(local_date(now, learner.timezone))
    # Everyone has been in the cohort since the week began, in the learner's time zone.
    week_began = local_midnight_utc(week, learner.timezone)
    rivals = _rivals(learner, week_began)
    cohort = LeagueCohort(tier=tier, week_start=week)
    session.add_all([cohort, *rivals])
    session.flush()  # assigns the ids the memberships refer to
    session.add_all(
        LeagueMembership(cohort_id=cohort.id, user_id=member.id, joined_at=week_began)
        for member in (learner, *rivals)
    )
    session.flush()
    return cohort


def _rivals(learner: User, created_at: datetime) -> list[User]:
    paces = list(RIVAL_PACES)
    random.Random("league-rivals").shuffle(paces)  # so a rival's name says nothing about pace
    return [
        User(
            username=_username(first_name, initial),
            display_name=f"{first_name} {initial}.",
            avatar_color=AVATAR_COLORS[index % len(AVATAR_COLORS)],
            timezone=learner.timezone,
            is_bot=True,
            bot_pace_xp=pace,
            current_course_id=learner.current_course_id,
            created_at=created_at,
        )
        for index, ((first_name, initial), pace) in enumerate(zip(RIVAL_NAMES, paces, strict=True))
    ]


def _username(first_name: str, initial: str) -> str:
    """``Tomás``, ``Q`` -> ``tomas_q``: lowercase ASCII, accents dropped."""
    plain = unicodedata.normalize("NFKD", first_name).encode("ascii", "ignore").decode()
    return f"{plain}_{initial}".lower()
