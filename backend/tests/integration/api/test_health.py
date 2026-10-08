"""GET /api/health, the headers every API response carries, and the API documentation."""

import re
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import __version__
from app.core.db import create_db_engine, get_db
from tests.conftest import sqlite_url


@contextmanager
def use_database(app: FastAPI, path: Path) -> Iterator[TestClient]:
    """Serve ``app`` from the database file at ``path`` instead of the seeded test database."""
    engine = create_db_engine(sqlite_url(path))

    def other_db() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = other_db
    try:
        with TestClient(app) as client:
            yield client
    finally:
        engine.dispose()


def test_health_reports_a_seeded_database(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok", "seeded": True, "version": __version__}


def test_health_reports_an_unseeded_database(app: FastAPI, empty_db_path: Path) -> None:
    with use_database(app, empty_db_path) as client:
        assert client.get("/api/health").json()["seeded"] is False


def test_health_fails_when_the_database_is_not_migrated(app: FastAPI, tmp_path: Path) -> None:
    with use_database(app, tmp_path / "blank.db") as client:
        response = client.get("/api/health")
        assert response.status_code == 503
        assert response.headers["content-type"] == "application/problem+json"
        assert response.json()["code"] == "db_unavailable"


def test_api_responses_carry_the_request_id_and_api_headers(client: TestClient) -> None:
    response = client.get("/api/health", headers={"X-Request-ID": "req-123"})
    assert response.headers["X-Request-ID"] == "req-123"
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Robots-Tag"] == "noindex, nofollow"
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_a_missing_or_odd_request_id_is_replaced(client: TestClient) -> None:
    for headers in ({}, {"X-Request-ID": "not an id; drop table"}):
        request_id = client.get("/api/health", headers=headers).headers["X-Request-ID"]
        assert re.fullmatch(r"[0-9a-f]{32}", request_id)


def test_openapi_and_docs_are_served_under_api(client: TestClient) -> None:
    schema = client.get("/api/openapi.json")
    assert schema.status_code == 200
    assert "/api/health" in schema.json()["paths"]
    assert client.get("/api/docs").status_code == 200


def test_pages_outside_the_api_skip_the_api_headers(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 404
    assert "X-Request-ID" in response.headers
    assert "Cache-Control" not in response.headers
