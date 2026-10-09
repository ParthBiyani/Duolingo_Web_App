"""Logging in as a sample learner: the session cookie, 401s and isolation between learners."""

from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.clock import FixedClock
from app.core.config import Settings, get_settings
from app.core.security import SESSION_COOKIE, read_session, sign_session
from tests.conftest import log_in

PROTECTED = [
    ("GET", "/api/v1/me"),
    ("GET", "/api/v1/courses/current/path"),
    ("GET", "/api/v1/leaderboard"),
    ("GET", "/api/v1/profile"),
    ("GET", "/api/v1/shop"),
]


def test_sample_learners_are_public(anonymous_client: TestClient) -> None:
    learners = anonymous_client.get("/api/v1/auth/learners").json()
    summary = {
        learner["username"]: (
            learner["initials"],
            learner["xp_total"],
            learner["streak"],
            learner["unit_number"],
            learner["league_name"],
        )
        for learner in learners
    }
    assert summary == {
        "parthbiyani": ("PB", 1240, 12, 2, "Silver"),
        "zoefernandes": ("ZF", 0, 0, 1, "Bronze"),
        "ishanair": ("IN", 205, 4, 1, "Bronze"),
        "kabirmalhotra": ("KM", 4120, 64, 3, "Gold"),
    }
    assert learners[0]["unit_title"] == "Around us"  # the fixture course's unit 2
    assert all(learner["avatar_color"].startswith("#") for learner in learners)


def test_a_streak_that_lapsed_shows_as_zero(
    anonymous_client: TestClient, clock: FixedClock
) -> None:
    clock.advance(timedelta(days=3))  # Isha has no freeze to cover the missed days
    learners = {
        row["username"]: row for row in anonymous_client.get("/api/v1/auth/learners").json()
    }
    assert learners["ishanair"]["streak"] == 0


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_routes_need_a_session(anonymous_client: TestClient, method: str, path: str) -> None:
    response = anonymous_client.request(method, path)
    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "not_authenticated"


def test_login_sets_a_signed_http_only_cookie(anonymous_client: TestClient) -> None:
    response = anonymous_client.post("/api/v1/auth/login", json={"username": "ishanair"})
    assert response.status_code == 200
    assert response.json()["display_name"] == "Isha Nair"
    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"{SESSION_COOKIE}=")
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie and "Path=/" in cookie
    assert f"Max-Age={30 * 24 * 3600}" in cookie
    assert "Secure" not in cookie  # plain HTTP outside production
    assert anonymous_client.get("/api/v1/me").json()["user"]["username"] == "ishanair"


def test_the_cookie_is_secure_in_production(app: FastAPI, settings: Settings) -> None:
    production = settings.model_copy(update={"app_env": "production"})
    app.dependency_overrides[get_settings] = lambda: production
    with TestClient(app, base_url="https://testserver") as client:
        response = client.post("/api/v1/auth/login", json={"username": "parthbiyani"})
        assert "Secure" in response.headers["set-cookie"]


@pytest.mark.parametrize("username", ["nobody", "maya_r"])  # unknown, and a league rival
def test_only_sample_learners_can_log_in(anonymous_client: TestClient, username: str) -> None:
    response = anonymous_client.post("/api/v1/auth/login", json={"username": username})
    assert response.status_code == 404
    assert response.json()["code"] == "learner_not_found"
    assert SESSION_COOKIE not in anonymous_client.cookies


def test_logout_clears_the_session(client: TestClient) -> None:
    assert client.get("/api/v1/me").status_code == 200
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    assert f'{SESSION_COOKIE}=""' in response.headers["set-cookie"]
    assert client.get("/api/v1/me").status_code == 401


@pytest.mark.parametrize(
    "token",
    [
        "parthbiyani",  # no signature
        "parthbiyani.forged",
        sign_session("parthbiyani", "another-key"),
        sign_session("maya_r", "test-key"),  # validly signed, but a rival cannot log in
        sign_session("deleted", "test-key"),
    ],
)
def test_a_bad_cookie_is_rejected(app: FastAPI, settings: Settings, token: str) -> None:
    keyed = settings.model_copy(update={"secret_key": "test-key"})
    app.dependency_overrides[get_settings] = lambda: keyed
    with TestClient(app, cookies={SESSION_COOKIE: token}) as client:
        response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


def test_tokens_round_trip() -> None:
    token = sign_session("kabirmalhotra", "key")
    assert read_session(token, "key") == "kabirmalhotra"
    assert read_session(token, "other") is None
    assert read_session(token + "x", "key") is None
    assert read_session("ünïcode.sïgnature", "key") is None
    assert read_session(".sig", "key") is None


def test_learners_never_see_each_other(app: FastAPI) -> None:
    with TestClient(app) as parth, TestClient(app) as zoe:
        log_in(parth, "parthbiyani")
        log_in(zoe, "zoefernandes")

        me = zoe.get("/api/v1/me").json()
        assert me["user"]["username"] == "zoefernandes"
        assert me["stats"]["xp_total"] == 0 and me["stats"]["streak"]["current"] == 0
        first = zoe.get("/api/v1/courses/current/path").json()["units"][0]["nodes"][0]
        assert first["state"] == "active" and first["lessons_completed"] == 0

        # Zoe's change of goal leaves Parth's alone.
        assert zoe.patch("/api/v1/me", json={"daily_goal_xp": 50}).status_code == 200
        assert parth.get("/api/v1/me").json()["settings"]["daily_goal_xp"] == 20
        assert parth.get("/api/v1/me").json()["stats"]["xp_total"] == 1240


def test_each_learner_sees_their_own_league(app: FastAPI) -> None:
    expected = {
        "parthbiyani": ("Parth Biyani", "Silver"),
        "zoefernandes": ("Zoe Fernandes", "Bronze"),
        "ishanair": ("Isha Nair", "Bronze"),
        "kabirmalhotra": ("Kabir Malhotra", "Gold"),
    }
    with TestClient(app) as client:
        for username, (name, league) in expected.items():
            log_in(client, username)
            board = client.get("/api/v1/leaderboard").json()
            assert board["name"] == league
            me = [row for row in board["rows"] if row["is_me"]]
            assert [row["display_name"] for row in me] == [name]
            assert len(board["rows"]) == 30
        log_in(client, "zoefernandes")
        assert client.get("/api/v1/leaderboard").json()["unlocked"] is False
