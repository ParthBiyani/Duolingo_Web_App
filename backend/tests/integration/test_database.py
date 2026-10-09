"""The SQLite layer: connection pragmas, immediate transactions, and the schema's constraints."""

import sqlite3
from datetime import date
from pathlib import Path

import pytest
from sqlalchemy import Connection, Engine, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.core import db as db_module
from app.core.clock import get_clock_offset, set_clock_offset
from app.core.db import create_db_engine, get_db, session_scope
from app.domain.hearts import MAX_HEARTS
from app.models import DailyActivity, GemTransaction, User, UserStats, XpEvent
from tests.conftest import DEFAULT_USERNAME, NOW, sqlite_url


def learner_id(db: Session) -> int:
    user_id = db.scalar(select(User.id).where(User.username == DEFAULT_USERNAME))
    assert user_id is not None
    return user_id


def pragma(connection: Connection, name: str) -> object:
    return connection.exec_driver_sql(f"PRAGMA {name}").scalar()


def test_connections_use_the_configured_pragmas(engine: Engine) -> None:
    with engine.connect() as connection:
        assert pragma(connection, "foreign_keys") == 1
        assert pragma(connection, "journal_mode") == "wal"
        assert pragma(connection, "busy_timeout") == 5000
        assert pragma(connection, "synchronous") == 1  # NORMAL


def test_migrations_can_turn_foreign_keys_off(db_path: Path) -> None:
    engine = create_db_engine(sqlite_url(db_path), enforce_foreign_keys=False)
    try:
        with engine.connect() as connection:
            assert pragma(connection, "foreign_keys") == 0
    finally:
        engine.dispose()


def test_only_sqlite_urls_are_accepted() -> None:
    with pytest.raises(ValueError, match="only SQLite"):
        create_db_engine("postgresql://localhost/app")


def test_a_transaction_takes_the_write_lock_when_it_begins(engine: Engine, db_path: Path) -> None:
    with engine.connect() as connection:
        connection.exec_driver_sql("SELECT 1")  # the first statement emits BEGIN IMMEDIATE
        other = sqlite3.connect(db_path, timeout=0)
        try:
            with pytest.raises(sqlite3.OperationalError, match="locked"):
                other.execute("BEGIN IMMEDIATE")
        finally:
            other.close()


def test_foreign_keys_are_enforced(db: Session) -> None:
    db.add(
        XpEvent(user_id=9999, source="lesson", amount=10, occurred_at=NOW, local_date=NOW.date())
    )
    with pytest.raises(IntegrityError):
        db.flush()


def test_deleting_a_learner_cascades_to_their_rows(db: Session) -> None:
    user_id = learner_id(db)
    db.execute(delete(User).where(User.id == user_id))
    for model in (UserStats, XpEvent, GemTransaction, DailyActivity):
        count = db.scalar(select(func.count()).select_from(model).where(model.user_id == user_id))
        assert count == 0, model.__tablename__


@pytest.mark.parametrize(
    ("column", "value"),
    [
        ("hearts", MAX_HEARTS + 1),  # more than the maximum
        ("gems", -1),  # a negative balance
        ("streak_freezes", 3),  # more freezes than can be held
        ("hearts", MAX_HEARTS - 1),  # a heart missing but no regeneration clock running
    ],
)
def test_user_stats_checks_reject_impossible_values(
    db: Session, column: str, value: object
) -> None:
    stats = db.get(UserStats, learner_id(db))
    assert stats is not None
    setattr(stats, column, value)
    with pytest.raises(IntegrityError):
        db.flush()


def test_one_bot_xp_row_per_rival_per_day(db: Session) -> None:
    rival = db.scalar(select(User.id).where(User.is_bot.is_(True)).limit(1))
    assert rival is not None
    day = date(2026, 10, 6)
    db.add(XpEvent(user_id=rival, source="bot", amount=30, occurred_at=NOW, local_date=day))
    db.flush()
    db.add(XpEvent(user_id=rival, source="bot", amount=40, occurred_at=NOW, local_date=day))
    with pytest.raises(IntegrityError):
        db.flush()


def test_several_learner_xp_rows_on_one_day_are_fine(db: Session) -> None:
    user_id = learner_id(db)
    for amount in (10, 12):
        db.add(
            XpEvent(
                user_id=user_id,
                source="practice",
                amount=amount,
                occurred_at=NOW,
                local_date=NOW.date(),
            )
        )
    db.flush()


def test_a_one_off_gem_reward_cannot_be_paid_twice(db: Session) -> None:
    reward = {
        "user_id": learner_id(db),
        "delta": 5,
        "reason": "goal_chest",
        "ref": "goal:2026-10-09",
        "created_at": NOW,
    }
    db.add(GemTransaction(**reward, balance_after=505))
    db.flush()
    db.add(GemTransaction(**reward, balance_after=510))
    with pytest.raises(IntegrityError):
        db.flush()


def test_session_scope_commits_on_success_and_rolls_back_on_error(
    session_factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(db_module, "SessionLocal", session_factory)
    with session_scope() as session:
        set_clock_offset(session, 60)
    with pytest.raises(RuntimeError), session_scope() as session:
        set_clock_offset(session, 120)
        raise RuntimeError("the script failed half way")

    requests = get_db()  # the request dependency sees what the scripts committed
    session = next(requests)
    assert get_clock_offset(session) == 60
    requests.close()
