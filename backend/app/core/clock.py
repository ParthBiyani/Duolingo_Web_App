"""Injectable clock, so time-based rules (hearts, streaks, leagues) can be simulated and tested.

- ``SystemClock`` returns real time.
- ``OffsetClock`` returns real time plus the offset the demo tools persist in ``app_settings``.
- ``FixedClock`` stands still until a test moves it.
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Protocol

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.models import AppSetting

CLOCK_OFFSET_KEY = "clock_offset_seconds"


class Clock(Protocol):
    def now(self) -> datetime:
        """Return the current instant as a timezone-aware UTC datetime."""
        ...


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class OffsetClock:
    """Real time moved forward by a fixed offset: the demo tools' simulated time."""

    def __init__(self, offset: timedelta) -> None:
        self.offset = offset

    def now(self) -> datetime:
        return datetime.now(UTC) + self.offset


class FixedClock:
    """A clock that only moves when told to."""

    def __init__(self, at: datetime) -> None:
        self._now = _as_utc(at)

    def now(self) -> datetime:
        return self._now

    def set(self, at: datetime) -> None:
        self._now = _as_utc(at)

    def advance(self, delta: timedelta) -> None:
        self._now += delta


def get_clock_offset(session: Session) -> int:
    """Return the persisted demo clock offset in seconds (0 when it was never set)."""
    setting = session.get(AppSetting, CLOCK_OFFSET_KEY)
    return int(setting.value) if setting is not None else 0


def set_clock_offset(session: Session, seconds: int) -> None:
    """Persist the demo clock offset. The caller commits."""
    setting = session.get(AppSetting, CLOCK_OFFSET_KEY)
    if setting is None:
        session.add(AppSetting(key=CLOCK_OFFSET_KEY, value=str(seconds)))
    else:
        setting.value = str(seconds)


def get_clock(
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Clock:
    """FastAPI dependency: real time, or the demo's shifted time when demo tools are enabled.

    The offset is read once per request through the request's own session. Reading it through
    a second session would wait on the request's ``BEGIN IMMEDIATE`` transaction.
    """
    if settings.demo_tools:
        return OffsetClock(timedelta(seconds=get_clock_offset(db)))
    return SystemClock()


def _as_utc(at: datetime) -> datetime:
    if at.utcoffset() is None:
        raise ValueError("the clock needs a timezone-aware datetime")
    return at.astimezone(UTC)
