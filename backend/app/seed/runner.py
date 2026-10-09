"""Seeding entry points, shared by the command line and the demo reset.

Each function writes inside the caller's transaction; the caller commits.
"""

from datetime import datetime
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Course, LeagueCohort, User
from app.seed.catalog import SPANISH_COURSE_SLUG, seed_catalog
from app.seed.course import seed_course_content
from app.seed.leagues import seed_league_week
from app.seed.learner import seed_learner
from app.seed.learners import LEARNERS
from app.seed.schema import CONTENT_DIR, load_units


def is_seeded(session: Session) -> bool:
    """Whether the Spanish course exists. It is written in the same transaction as everything
    else, so its presence means the whole seed is there."""
    return session.scalar(select(Course.id).where(Course.slug == SPANISH_COURSE_SLUG)) is not None


def seed_database(session: Session, now: datetime, content_dir: Path = CONTENT_DIR) -> bool:
    """Seed an empty database: catalogue, course content, the learners and the rivals.

    Returns False without writing anything when the database is already seeded.
    """
    if is_seeded(session):
        return False
    units = load_units(content_dir)  # validate all of the content before writing any of it
    course = seed_catalog(session)
    seed_course_content(session, course, units)
    seed_people(session, course, now)
    return True


def reset_people(session: Session, now: datetime) -> list[User]:
    """Replace the learners, the rivals and the league cohorts with fresh ones as of ``now``.

    Course content and the catalogue are kept. Deleting the users cascades to every
    per-learner row (progress, sessions, ledgers, activity, memberships and achievements).

    Pending changes are flushed first, then every loaded object is detached from the session:
    SQLite hands the freed ids to the new rows, and a stale object holding the same id would
    clash with its replacement. Do not use objects loaded before the reset afterwards.
    """
    session.flush()
    session.expunge_all()
    session.execute(delete(LeagueCohort))
    session.execute(delete(User))
    course = session.scalars(select(Course).where(Course.slug == SPANISH_COURSE_SLUG)).one()
    return seed_people(session, course, now)


def seed_people(session: Session, course: Course, now: datetime) -> list[User]:
    """Seed the sample learners and this week's league cohorts, with the rivals that fill them.

    Learners in the same league share a cohort. Returns the learners in ``LEARNERS`` order.
    """
    learners = [seed_learner(session, course, profile, now) for profile in LEARNERS]
    seed_league_week(session, learners, now)
    return learners
