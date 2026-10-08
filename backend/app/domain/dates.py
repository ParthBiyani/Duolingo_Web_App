"""Calendar helpers. The server stores UTC instants; learners live in their own time zone."""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def local_date(now_utc: datetime, tz: str) -> date:
    """Return the calendar date in time zone ``tz`` at the instant ``now_utc``."""
    if now_utc.utcoffset() is None:
        # astimezone() would silently read a naive value as the server's own local time.
        raise ValueError("now_utc must be timezone-aware")
    return now_utc.astimezone(ZoneInfo(tz)).date()


def week_start(day: date) -> date:
    """Return the Monday on or before ``day``. League weeks run Monday to Monday."""
    return day - timedelta(days=day.weekday())


def local_midnight_utc(day: date, tz: str) -> datetime:
    """Return the first instant of the local calendar day ``day`` in ``tz``, in UTC.

    This holds even where the clocks change at midnight: zoneinfo reads a skipped 00:00 with
    the offset in force before the change, which lands on the first instant that exists, and
    resolves a repeated 00:00 to its first occurrence.
    """
    return datetime.combine(day, time.min, tzinfo=ZoneInfo(tz)).astimezone(UTC)
