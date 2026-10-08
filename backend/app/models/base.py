"""Declarative base, constraint naming convention and the column types shared by the models."""

import json
from collections.abc import Iterable
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import CheckConstraint, MetaData, Text, text
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql.elements import TextClause
from sqlalchemy.types import TypeDecorator

# Every constraint and index gets a predictable name. SQLite cannot alter a constraint in place,
# so batch migrations rebuild the table and need these names to find the constraint again.
NAMING_CONVENTION = {
    "pk": "pk_%(table_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
}


class UTCDateTime(TypeDecorator[datetime]):
    """An aware datetime stored as fixed-width UTC ISO-8601 text: ``2026-10-09T07:15:00.000000Z``.

    The fixed width keeps text comparisons and ``ORDER BY`` in chronological order.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> str | None:
        if value is None:
            return None
        if value.utcoffset() is None:
            raise ValueError("naive datetime; pass a timezone-aware value")
        return value.astimezone(UTC).isoformat(timespec="microseconds").replace("+00:00", "Z")

    def process_result_value(self, value: str | None, dialect: Dialect) -> datetime | None:
        return None if value is None else datetime.fromisoformat(value).astimezone(UTC)


class LocalDate(TypeDecorator[date]):
    """A calendar date in the learner's time zone, stored as ``YYYY-MM-DD`` text."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: date | str | None, dialect: Dialect) -> str | None:
        return None if value is None else to_date(value).isoformat()

    def process_result_value(self, value: str | None, dialect: Dialect) -> date | None:
        return None if value is None else date.fromisoformat(value)


class JSONText(TypeDecorator[Any]):
    """A JSON list or object stored as compact text; each table adds a ``json_valid`` CHECK."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Dialect) -> str | None:
        if value is None:
            return None
        if not isinstance(value, list | dict):
            # Catches an already-encoded string, which would otherwise be stored double-encoded.
            raise TypeError(f"JSON columns hold lists or dicts, got {type(value).__name__}")
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    def process_result_value(self, value: str | None, dialect: Dialect) -> Any:
        return None if value is None else json.loads(value)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    # Plain `Mapped[str]` columns are TEXT (SQLite's native type) rather than VARCHAR.
    type_annotation_map = {str: Text(), datetime: UTCDateTime(), date: LocalDate()}  # noqa: RUF012


def to_date(value: date | str) -> date:
    """Accept a date or an ISO ``YYYY-MM-DD`` string. Datetimes are rejected: they carry a time."""
    if isinstance(value, datetime):
        raise TypeError("expected a date, got a datetime")
    if isinstance(value, date):
        return value
    return date.fromisoformat(value)


def int_default(value: int) -> TextClause:
    """A numeric server default, rendered unquoted in the DDL (``DEFAULT 0``)."""
    return text(str(value))


def check_in(
    column: str, values: Iterable[str | int], *, name: str | None = None
) -> CheckConstraint:
    """``CHECK (column IN (...))``, built from the Literal type that annotates the column."""
    rendered = ", ".join(f"'{value}'" if isinstance(value, str) else str(value) for value in values)
    return CheckConstraint(f"{column} IN ({rendered})", name=name or column)


def check_bool(column: str) -> CheckConstraint:
    """SQLite has no boolean type, so a flag column is an integer kept to 0 or 1."""
    return check_in(column, (0, 1), name=f"{column}_bool")
