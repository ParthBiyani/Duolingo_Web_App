"""Demo tools: a persisted clock offset and a reset of learner data."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.clock import SystemClock, get_clock_offset, set_clock_offset
from app.schemas.demo import ClockResponse
from app.seed.runner import reset_people


def get_clock(db: Session, now: datetime) -> ClockResponse:
    return ClockResponse(now=now, offset_seconds=get_clock_offset(db))


def advance_clock(db: Session, now: datetime, seconds: int) -> ClockResponse:
    offset = get_clock_offset(db) + seconds
    set_clock_offset(db, offset)
    db.commit()
    return ClockResponse(now=now + timedelta(seconds=seconds), offset_seconds=offset)


def reset_demo(db: Session) -> None:
    """Restore the sample learner, rivals and league week, and set the clock back to real time."""
    set_clock_offset(db, 0)
    reset_people(db, SystemClock().now())
    db.commit()
