"""Demo tools behind their flag, and per-learner isolation through the auth seam."""

from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import DbSession, get_current_user
from app.core.config import Settings, get_settings
from app.models import Course, User, UserSettings, UserStats


def test_demo_tools_are_hidden_when_disabled(client: TestClient) -> None:
    assert client.get("/api/v1/demo/clock").status_code == 404
    assert client.post("/api/v1/demo/reset").status_code == 404


def test_demo_clock_moves_forward_when_enabled(app: FastAPI, settings: Settings) -> None:
    enabled = settings.model_copy(update={"demo_tools": True})
    app.dependency_overrides[get_settings] = lambda: enabled
    with TestClient(app) as client:
        start = client.get("/api/v1/demo/clock").json()
        moved = client.post("/api/v1/demo/clock/advance", json={"seconds": 3600}).json()
        assert moved["offset_seconds"] == start["offset_seconds"] + 3600
        assert client.post("/api/v1/demo/clock/advance", json={"seconds": 0}).status_code == 422
        assert client.post("/api/v1/demo/reset").status_code == 204
        assert client.get("/api/v1/demo/clock").json()["offset_seconds"] == 0


def test_learners_never_see_each_other(app: FastAPI, db: Session) -> None:
    course = db.query(Course).filter(Course.is_available.is_(True)).first()
    assert course is not None
    other = User(
        username="otherlearner",
        display_name="Other Learner",
        avatar_color="#CE82FF",
        timezone="UTC",
        is_bot=False,
        bot_pace_xp=None,
        current_course_id=course.id,
        created_at=datetime(2026, 10, 1, tzinfo=UTC),
    )
    db.add(other)
    db.flush()
    db.add(UserSettings(user_id=other.id))
    db.add(UserStats(user_id=other.id))
    db.commit()

    def other_learner(request_db: DbSession) -> User:
        return request_db.scalars(select(User).where(User.username == "otherlearner")).one()

    app.dependency_overrides[get_current_user] = other_learner
    with TestClient(app) as client:
        me = client.get("/api/v1/me").json()
        assert me["user"]["username"] == "otherlearner"
        assert me["stats"]["xp_total"] == 0 and me["stats"]["streak"]["current"] == 0
        path = client.get("/api/v1/courses/current/path").json()
        first = path["units"][0]["nodes"][0]
        assert first["state"] == "active" and first["lessons_completed"] == 0
