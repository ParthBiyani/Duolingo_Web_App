"""The clocks, and the demo clock offset stored in ``app_settings``."""

from datetime import UTC, datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from app.core.clock import (
    FixedClock,
    OffsetClock,
    SystemClock,
    get_clock,
    get_clock_offset,
    set_clock_offset,
)
from app.core.config import Settings
from tests.conftest import NOW

IST = timezone(timedelta(hours=5, minutes=30))


def test_system_clock_returns_aware_utc_time() -> None:
    before = datetime.now(UTC)
    now = SystemClock().now()
    assert now.tzinfo is UTC
    assert before <= now <= datetime.now(UTC)


def test_fixed_clock_only_moves_when_told() -> None:
    clock = FixedClock(NOW)
    assert clock.now() == NOW
    clock.advance(timedelta(hours=5))
    assert clock.now() == NOW + timedelta(hours=5)
    clock.set(datetime(2026, 10, 12, tzinfo=IST))
    assert clock.now() == datetime(2026, 10, 11, 18, 30, tzinfo=UTC)
    assert clock.now().tzinfo is UTC


def test_clocks_reject_naive_datetimes() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        FixedClock(datetime(2026, 10, 9))


def test_offset_clock_runs_ahead_of_real_time() -> None:
    ahead = OffsetClock(timedelta(days=1)).now() - datetime.now(UTC)
    assert timedelta(hours=23) < ahead <= timedelta(days=1)


def test_clock_offset_is_stored_in_app_settings(db: Session) -> None:
    assert get_clock_offset(db) == 0
    set_clock_offset(db, 3_600)
    set_clock_offset(db, 7_200)  # updates the same row, flushed or not
    db.commit()
    assert get_clock_offset(db) == 7_200


def test_get_clock_applies_the_offset_only_with_demo_tools(db: Session) -> None:
    set_clock_offset(db, 86_400)
    assert isinstance(get_clock(db, Settings(demo_tools=False)), SystemClock)
    clock = get_clock(db, Settings(demo_tools=True))
    assert isinstance(clock, OffsetClock)
    assert clock.offset == timedelta(days=1)
