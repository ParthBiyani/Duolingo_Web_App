"""GET/PATCH /api/v1/me and /me/settings: settled stats and preferences."""

from datetime import timedelta

from fastapi.testclient import TestClient

from app.core.clock import FixedClock


def test_me_returns_the_seeded_learner(client: TestClient) -> None:
    body = client.get("/api/v1/me").json()
    assert body["user"]["display_name"] == "Parth Biyani"
    assert body["user"]["timezone"] == "Asia/Kolkata"
    stats = body["stats"]
    assert stats["hearts"] == 4 and stats["hearts_max"] == 5
    assert stats["next_heart_at"] is not None
    assert stats["streak"]["current"] == 12
    assert stats["streak"]["extended_today"] is False
    assert len(stats["streak"]["week"]) == 7
    assert stats["league"] == {"tier": 1, "name": "Silver", "unlocked": True}
    assert body["server_now"].startswith("2026-10-09T06:30")


def test_hearts_regenerate_lazily_over_time(client: TestClient, clock: FixedClock) -> None:
    clock.advance(timedelta(hours=5))
    stats = client.get("/api/v1/me").json()["stats"]
    assert stats["hearts"] == 5
    assert stats["next_heart_at"] is None


def test_streak_resets_after_two_missed_days_without_enough_freezes(
    client: TestClient, clock: FixedClock
) -> None:
    clock.advance(timedelta(days=4))
    assert client.get("/api/v1/me").json()["stats"]["streak"]["current"] == 0


def test_settings_and_daily_goal_can_be_updated(client: TestClient) -> None:
    settings = client.patch("/api/v1/me/settings", json={"theme": "dark", "sound_effects": False})
    assert settings.status_code == 200
    assert settings.json()["theme"] == "dark" and settings.json()["sound_effects"] is False

    me = client.patch("/api/v1/me", json={"daily_goal_xp": 30}).json()
    assert me["stats"]["daily_goal_xp"] == 30
    assert client.get("/api/v1/quests").json()["daily"][0]["target"] == 30


def test_invalid_updates_are_rejected(client: TestClient) -> None:
    bad_zone = client.patch("/api/v1/me", json={"timezone": "Mars/Base"})
    assert bad_zone.status_code == 422 and bad_zone.json()["code"] == "invalid_timezone"
    bad_goal = client.patch("/api/v1/me", json={"daily_goal_xp": 15})
    assert bad_goal.status_code == 422 and bad_goal.json()["code"] == "invalid_request"
