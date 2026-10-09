"""This week's league cohorts for the sample learners.

Learners whose leaderboard is unlocked are grouped by league tier, and each group shares one
cohort, topped up to 30 with rivals (``app.domain.rivals``), exactly as the app forms cohorts
when a new week starts (``app.services.leagues``). The rivals are ordinary ``users`` rows with
``is_bot`` set and a weekly XP pace. Their XP is not stored up front: the leaderboard adds it to
the XP ledger when it is read, so the table fills in as time passes. A learner whose
leaderboard is still locked gets no cohort; they join one when they unlock it.
"""

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy.orm import Session

from app.domain.dates import local_date, local_midnight_utc, week_start
from app.models import LeagueCohort, User
from app.services.leagues import form_cohort
from app.services.learner import leaderboard_unlocked


def seed_league_week(
    session: Session, learners: Sequence[User], now: datetime
) -> list[LeagueCohort]:
    """Create this week's cohorts: one per league tier that has an unlocked learner.

    Everyone has been in their cohort since the week began, in the learners' time zone.
    """
    by_tier: dict[int, list[User]] = {}
    for learner in learners:
        if leaderboard_unlocked(learner):
            by_tier.setdefault(learner.stats.league_tier, []).append(learner)
    cohorts = []
    for tier, members in sorted(by_tier.items()):
        timezone = members[0].timezone
        week = week_start(local_date(now, timezone))
        began = local_midnight_utc(week, timezone)
        cohorts.append(form_cohort(session, tier, week, members, joined_at=began))
    return cohorts
