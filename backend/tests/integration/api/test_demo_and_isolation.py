"""Demo tools behind their flag; isolation between learners is in test_auth."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from tests.conftest import log_in


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


def test_demo_reset_restores_every_learner_and_keeps_the_session(
    app: FastAPI, settings: Settings
) -> None:
    enabled = settings.model_copy(update={"demo_tools": True})
    app.dependency_overrides[get_settings] = lambda: enabled
    with TestClient(app) as client:
        log_in(client, "ishanair")
        assert client.patch("/api/v1/me", json={"daily_goal_xp": 50}).status_code == 200
        assert client.post("/api/v1/demo/reset").status_code == 204

        learners = client.get("/api/v1/auth/learners").json()
        assert [learner["username"] for learner in learners] == [
            "parthbiyani",
            "zoefernandes",
            "ishanair",
            "kabirmalhotra",
        ]
        me = client.get("/api/v1/me").json()  # the cookie names the learner, not their id
        assert me["user"]["username"] == "ishanair"
        assert me["settings"]["daily_goal_xp"] == 10
