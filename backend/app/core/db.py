"""SQLite engine, sessions, the request-scoped ``get_db`` dependency and ``session_scope``.

Every connection gets the same pragmas, and every transaction starts with ``BEGIN IMMEDIATE``.
That takes SQLite's write lock up front, so two transactions can never both read and then
deadlock while upgrading to a write. With a single Uvicorn worker and short transactions this
costs nothing. One rule follows from it: never open a second session while a request's
transaction is still open, because the second one would wait for the first.
"""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import Connection, make_url
from sqlalchemy.engine.interfaces import DBAPIConnection
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import ConnectionPoolEntry

from app.core.config import get_settings

CONNECTION_PRAGMAS = (
    "PRAGMA journal_mode=WAL",  # readers and the single writer do not block each other
    "PRAGMA busy_timeout=5000",  # wait up to 5 s for a lock instead of failing at once
    "PRAGMA synchronous=NORMAL",  # durable with WAL, and far fewer disk syncs than FULL
)


def create_db_engine(database_url: str, *, enforce_foreign_keys: bool = True) -> Engine:
    """Create an engine for a SQLite database file, creating its folder if it is missing.

    Migrations pass ``enforce_foreign_keys=False``: batch migrations rebuild a table by copying
    it, and with foreign keys on, dropping the old copy would cascade into the child tables.
    """
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite":
        raise ValueError(f"only SQLite is supported, got {url.get_backend_name()!r}")
    if url.database and url.database != ":memory:":
        Path(url.database).parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(url)
    foreign_keys = "ON" if enforce_foreign_keys else "OFF"

    @event.listens_for(engine, "connect")
    def _configure_connection(
        dbapi_connection: DBAPIConnection, _record: ConnectionPoolEntry
    ) -> None:
        if not isinstance(dbapi_connection, sqlite3.Connection):
            raise TypeError("expected a sqlite3 connection")
        # Stop the driver from issuing its own BEGIN; the "begin" listener below does it instead.
        dbapi_connection.isolation_level = None
        # This pragma only works outside a transaction, which is where a new connection is.
        dbapi_connection.execute(f"PRAGMA foreign_keys={foreign_keys}")
        for pragma in CONNECTION_PRAGMAS:
            dbapi_connection.execute(pragma)

    @event.listens_for(engine, "begin")
    def _begin_immediate(connection: Connection) -> None:
        connection.exec_driver_sql("BEGIN IMMEDIATE")

    return engine


engine = create_db_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request.

    Services commit their unit of work explicitly; anything left uncommitted is rolled back
    when the session closes.
    """
    with SessionLocal() as session:
        yield session


@contextmanager
def session_scope() -> Iterator[Session]:
    """Run a script's work in one transaction: commit on success, roll back on any error."""
    with SessionLocal.begin() as session:
        yield session
