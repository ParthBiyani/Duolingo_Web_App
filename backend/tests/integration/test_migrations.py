"""The Alembic migration builds the whole schema, matches the models and can be reversed."""

from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect

from app.core.db import create_db_engine
from app.models import Base
from tests.conftest import alembic_config, migrate, sqlite_url

TABLES = {
    # content
    "courses", "units", "skills", "lessons", "exercises", "exercise_options", "exercise_answers",
    # learners
    "users", "user_settings", "user_stats", "skill_progress",
    # sessions
    "sessions", "session_answers",
    # ledgers
    "xp_events", "gem_transactions", "daily_activity",
    # leagues and catalogue
    "leagues", "league_cohorts", "league_memberships", "achievements", "user_achievements",
    "shop_items", "app_settings",
}  # fmt: skip


def table_names(path: Path) -> set[str]:
    engine = create_db_engine(sqlite_url(path))
    try:
        return set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def test_upgrade_creates_all_23_tables(empty_db_path: Path) -> None:
    assert len(TABLES) == 23
    assert table_names(empty_db_path) == TABLES | {"alembic_version"}


def test_migration_matches_the_models(empty_db_path: Path) -> None:
    """Autogenerate finds nothing to add, so the models and the migration agree."""
    engine = create_db_engine(sqlite_url(empty_db_path))
    try:
        with engine.connect() as connection:
            differences = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    finally:
        engine.dispose()
    assert differences == []


def test_partial_unique_indexes_exist(empty_db_path: Path) -> None:
    engine = create_db_engine(sqlite_url(empty_db_path))
    try:
        with engine.connect() as connection:
            rows = connection.exec_driver_sql(
                "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql LIKE '%WHERE%'"
            ).all()
    finally:
        engine.dispose()
    indexes = {name: sql for name, sql in rows}
    assert "WHERE source = 'bot'" in indexes["ux_xp_events_bot_day"]
    assert "WHERE ref IS NOT NULL" in indexes["ux_gem_once"]


def test_downgrade_removes_everything_and_upgrade_rebuilds_it(empty_db_path: Path) -> None:
    url = sqlite_url(empty_db_path)
    command.downgrade(alembic_config(url), "base")
    assert table_names(empty_db_path) == {"alembic_version"}
    migrate(url)
    assert table_names(empty_db_path) == TABLES | {"alembic_version"}
