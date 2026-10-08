"""The custom column types, and the models' coercion of local-date attributes."""

from datetime import UTC, date, datetime, timedelta, timezone

import pytest
from sqlalchemy.dialects import sqlite

from app.models import DailyActivity, LeagueCohort, UserStats, XpEvent
from app.models.base import JSONText, LocalDate, UTCDateTime, check_in

DIALECT = sqlite.dialect()
IST = timezone(timedelta(hours=5, minutes=30))


def test_utc_datetime_stores_fixed_width_utc_text() -> None:
    column = UTCDateTime()
    stored = column.process_bind_param(datetime(2026, 10, 9, 12, 0, tzinfo=IST), DIALECT)
    assert stored == "2026-10-09T06:30:00.000000Z"
    assert column.process_result_value(stored, DIALECT) == datetime(2026, 10, 9, 6, 30, tzinfo=UTC)
    assert column.process_bind_param(None, DIALECT) is None
    assert column.process_result_value(None, DIALECT) is None


def test_utc_datetime_text_sorts_in_time_order() -> None:
    column = UTCDateTime()
    instants = [
        datetime(2026, 10, 9, 6, 30, 0, 5, tzinfo=UTC),
        datetime(2026, 10, 9, 6, 30, 1, tzinfo=UTC),
        datetime(2026, 10, 10, tzinfo=UTC),
    ]
    stored = [str(column.process_bind_param(instant, DIALECT)) for instant in instants]
    assert sorted(stored) == stored


def test_utc_datetime_rejects_naive_values() -> None:
    with pytest.raises(ValueError, match="naive"):
        UTCDateTime().process_bind_param(datetime(2026, 10, 9), DIALECT)


def test_local_date_accepts_dates_and_iso_strings() -> None:
    column = LocalDate()
    assert column.process_bind_param(date(2026, 10, 9), DIALECT) == "2026-10-09"
    assert column.process_bind_param("2026-10-09", DIALECT) == "2026-10-09"
    assert column.process_result_value("2026-10-09", DIALECT) == date(2026, 10, 9)
    with pytest.raises(TypeError, match="datetime"):
        column.process_bind_param(datetime(2026, 10, 9, tzinfo=UTC), DIALECT)


def test_json_text_stores_compact_json() -> None:
    column = JSONText()
    assert column.process_bind_param([3, 1, 2], DIALECT) == "[3,1,2]"
    assert column.process_bind_param({"text": "¡Hola!"}, DIALECT) == '{"text":"¡Hola!"}'
    assert column.process_result_value('{"pair":[4,9]}', DIALECT) == {"pair": [4, 9]}
    assert column.process_bind_param(None, DIALECT) is None


def test_json_text_rejects_an_already_encoded_string() -> None:
    with pytest.raises(TypeError, match="lists or dicts"):
        JSONText().process_bind_param("[1, 2]", DIALECT)


def test_local_date_attributes_always_hold_dates() -> None:
    assert XpEvent(local_date="2026-10-09").local_date == date(2026, 10, 9)
    assert DailyActivity(local_date="2026-10-09").local_date == date(2026, 10, 9)
    assert LeagueCohort(week_start="2026-10-05").week_start == date(2026, 10, 5)
    assert UserStats(streak_last_date="2026-10-08").streak_last_date == date(2026, 10, 8)
    assert UserStats(streak_last_date=None).streak_last_date is None


def test_check_in_lists_the_allowed_values() -> None:
    assert str(check_in("theme", ("light", "dark")).sqltext) == "theme IN ('light', 'dark')"
    assert str(check_in("goal", (1, 10)).sqltext) == "goal IN (1, 10)"
