from datetime import UTC, date, datetime, timedelta, timezone

import pytest

from app.domain.dates import local_date, local_midnight_utc, week_start

IST = "Asia/Kolkata"  # UTC+05:30 all year, so its days start at 18:30 UTC the evening before
MONDAY = date(2026, 10, 5)


@pytest.mark.parametrize(
    ("instant", "tz", "expected"),
    [
        pytest.param(
            datetime(2026, 10, 8, 18, 29, 59, tzinfo=UTC), IST, date(2026, 10, 8), id="ist-23-59"
        ),
        pytest.param(
            datetime(2026, 10, 8, 18, 30, tzinfo=UTC), IST, date(2026, 10, 9), id="ist-00-00"
        ),
        pytest.param(
            datetime(2026, 10, 8, 23, 59, tzinfo=UTC), IST, date(2026, 10, 9), id="ist-05-29"
        ),
        pytest.param(
            datetime(2026, 10, 8, 23, 59, 59, tzinfo=UTC), "UTC", date(2026, 10, 8), id="utc-23-59"
        ),
        pytest.param(datetime(2026, 10, 9, tzinfo=UTC), "UTC", date(2026, 10, 9), id="utc-00-00"),
        pytest.param(
            datetime(2026, 10, 9, 3, 59, tzinfo=UTC),
            "America/New_York",
            date(2026, 10, 8),
            id="new-york-23-59",
        ),
        pytest.param(
            datetime(2026, 10, 9, 4, 0, tzinfo=UTC),
            "America/New_York",
            date(2026, 10, 9),
            id="new-york-00-00",
        ),
    ],
)
def test_local_date_follows_the_learners_time_zone(
    instant: datetime, tz: str, expected: date
) -> None:
    assert local_date(instant, tz) == expected


def test_the_ist_day_starts_while_utc_is_still_on_the_previous_day() -> None:
    instant = datetime(2026, 10, 8, 20, 0, tzinfo=UTC)  # 01:30 on 9 October in India
    assert local_date(instant, IST) == date(2026, 10, 9)
    assert local_date(instant, "UTC") == date(2026, 10, 8)


def test_local_date_accepts_any_aware_datetime() -> None:
    india_offset = timezone(timedelta(hours=5, minutes=30))
    instant = datetime(2026, 10, 9, 0, 30, tzinfo=india_offset)  # 19:00 UTC on 8 October
    assert local_date(instant, "UTC") == date(2026, 10, 8)


def test_local_date_rejects_naive_datetimes() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        local_date(datetime(2026, 10, 9, 12, 0), IST)


@pytest.mark.parametrize("offset", range(7), ids=["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
def test_every_day_of_a_week_belongs_to_its_monday(offset: int) -> None:
    assert week_start(MONDAY + timedelta(days=offset)) == MONDAY


@pytest.mark.parametrize(
    ("day", "monday"),
    [
        pytest.param(date(2026, 1, 1), date(2025, 12, 29), id="across-new-year"),
        pytest.param(date(2026, 3, 1), date(2026, 2, 23), id="across-month-end"),
    ],
)
def test_week_start_crosses_month_and_year_boundaries(day: date, monday: date) -> None:
    assert week_start(day) == monday


@pytest.mark.parametrize(
    ("day", "tz", "expected"),
    [
        pytest.param(date(2026, 10, 9), IST, datetime(2026, 10, 8, 18, 30, tzinfo=UTC), id="ist"),
        pytest.param(date(2026, 10, 9), "UTC", datetime(2026, 10, 9, tzinfo=UTC), id="utc"),
        pytest.param(
            date(2026, 10, 9),
            "America/New_York",
            datetime(2026, 10, 9, 4, tzinfo=UTC),
            id="new-york-summer-time",
        ),
        pytest.param(
            date(2026, 12, 9),
            "America/New_York",
            datetime(2026, 12, 9, 5, tzinfo=UTC),
            id="new-york-standard-time",
        ),
        # Chile springs forward from 00:00 to 01:00 that night, so the day begins at 01:00.
        pytest.param(
            date(2026, 9, 6),
            "America/Santiago",
            datetime(2026, 9, 6, 4, tzinfo=UTC),
            id="midnight-skipped",
        ),
        # Cuba falls back from 01:00 to 00:00 that night, so midnight happens twice.
        pytest.param(
            date(2026, 11, 1),
            "America/Havana",
            datetime(2026, 11, 1, 4, tzinfo=UTC),
            id="midnight-repeated",
        ),
    ],
)
def test_local_midnight_utc(day: date, tz: str, expected: datetime) -> None:
    start = local_midnight_utc(day, tz)
    assert start == expected
    assert start.tzinfo is UTC


@pytest.mark.parametrize(
    ("day", "tz"),
    [
        (date(2026, 10, 9), IST),
        (date(2026, 10, 9), "UTC"),
        (date(2026, 3, 8), "America/New_York"),
        (date(2026, 9, 6), "America/Santiago"),
        (date(2026, 11, 1), "America/Havana"),
    ],
)
def test_local_midnight_utc_is_the_first_instant_of_the_local_day(day: date, tz: str) -> None:
    start = local_midnight_utc(day, tz)
    assert local_date(start, tz) == day
    assert local_date(start - timedelta(microseconds=1), tz) == day - timedelta(days=1)


def test_a_league_week_ends_at_local_monday_midnight() -> None:
    sunday_23_59 = datetime(2026, 10, 11, 18, 29, tzinfo=UTC)  # in India
    monday_00_00 = datetime(2026, 10, 11, 18, 30, tzinfo=UTC)  # in India
    this_week = week_start(local_date(sunday_23_59, IST))

    assert this_week == MONDAY
    assert week_start(local_date(monday_00_00, IST)) == MONDAY + timedelta(days=7)
    assert local_midnight_utc(this_week + timedelta(days=7), IST) == monday_00_00
    # By UTC dates it is still Sunday, so a UTC-based week would run 5.5 hours longer.
    assert week_start(local_date(monday_00_00, "UTC")) == MONDAY
