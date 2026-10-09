"""Shared fixtures: a migrated and seeded temporary SQLite database, a fixed clock and a client.

The database is migrated with Alembic and seeded from the small fixture course in
``tests/fixtures/content`` once per test run; every test then works on its own copy of that
file, so tests never share state and never touch the development database.

- ``db``: a session on the test's seeded database.
- ``clock``: a ``FixedClock`` at ``NOW``; move it with ``clock.advance(...)``.
- ``client``: a ``TestClient`` whose ``get_db``, ``get_clock`` and ``get_settings`` point at the
  test database, the fixed clock and ``settings``, logged in as the default learner.
- ``anonymous_client``: the same, before logging in; ``log_in`` logs any client in.
"""

import shutil
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.clock import FixedClock, get_clock
from app.core.config import BACKEND_DIR, Settings, get_settings
from app.core.db import create_db_engine, get_db
from app.main import create_app
from app.seed.learners import PARTH
from app.seed.runner import seed_database

FIXTURES_DIR = Path(__file__).parent / "fixtures"
CONTENT_DIR = FIXTURES_DIR / "content"

# Friday 9 October 2026, 12:00 in Asia/Kolkata, the sample learners' time zone.
NOW = datetime(2026, 10, 9, 6, 30, tzinfo=UTC)

DEFAULT_USERNAME = PARTH.username  # the learner ``client`` is logged in as


def sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.as_posix()}"


def alembic_config(url: str) -> Config:
    """The project's Alembic configuration, pointed at ``url``."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", url)
    config.attributes["configure_logger"] = False  # keep pytest's logging setup
    return config


def migrate(url: str) -> None:
    """Run every migration against ``url``, exactly like ``alembic upgrade head``."""
    command.upgrade(alembic_config(url), "head")


@pytest.fixture(scope="session")
def migrated_template(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """An empty, fully migrated database file, built once per test run. Copy it; never open it."""
    path = tmp_path_factory.mktemp("templates") / "migrated.db"
    migrate(sqlite_url(path))
    return path


@pytest.fixture(scope="session")
def seeded_template(tmp_path_factory: pytest.TempPathFactory, migrated_template: Path) -> Path:
    """The migrated database seeded from the fixture course as of ``NOW``, built once."""
    path = tmp_path_factory.mktemp("templates") / "seeded.db"
    shutil.copyfile(migrated_template, path)
    engine = create_db_engine(sqlite_url(path))
    try:
        with Session(engine) as session, session.begin():
            seed_database(session, NOW, CONTENT_DIR)
    finally:
        engine.dispose()  # closing the last connection checkpoints the WAL into the file
    return path


@pytest.fixture
def db_path(tmp_path: Path, seeded_template: Path) -> Path:
    """This test's own copy of the seeded database."""
    path = tmp_path / "app.db"
    shutil.copyfile(seeded_template, path)
    return path


@pytest.fixture
def empty_db_path(tmp_path: Path, migrated_template: Path) -> Path:
    """This test's own copy of the migrated database, before any seeding."""
    path = tmp_path / "empty.db"
    shutil.copyfile(migrated_template, path)
    return path


@pytest.fixture
def engine(db_path: Path) -> Iterator[Engine]:
    engine = create_db_engine(sqlite_url(db_path))
    yield engine
    engine.dispose()  # Windows cannot delete a database file that is still open


@pytest.fixture
def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture
def db(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    with session_factory() as session:
        yield session


@pytest.fixture
def clock() -> FixedClock:
    return FixedClock(NOW)


@pytest.fixture
def settings(db_path: Path) -> Settings:
    return Settings(
        database_url=sqlite_url(db_path), app_env="test", demo_tools=False, log_level="warning"
    )


@pytest.fixture
def app(settings: Settings, session_factory: sessionmaker[Session], clock: FixedClock) -> FastAPI:
    """The application wired to the test database, the fixed clock and the test settings."""
    application = create_app(settings)

    def test_db() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    application.dependency_overrides[get_db] = test_db
    application.dependency_overrides[get_clock] = lambda: clock
    application.dependency_overrides[get_settings] = lambda: settings
    return application


def log_in(client: TestClient, username: str = DEFAULT_USERNAME) -> None:
    """Log ``client`` in as ``username``; the session cookie then rides on every request."""
    response = client.post("/api/v1/auth/login", json={"username": username})
    assert response.status_code == 200, response.text


@pytest.fixture
def anonymous_client(app: FastAPI) -> Iterator[TestClient]:
    """A client that has not logged in."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client(anonymous_client: TestClient) -> TestClient:
    """A client logged in as the default learner, Parth Biyani."""
    log_in(anonymous_client)
    return anonymous_client
