"""Shop and heart refills, the weekly league, the profile and the daily-goal quest."""

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.clock import FixedClock
from tests.integration.api.play import active_node, complete, solve_all, start


def test_shop_lists_items_with_availability(client: TestClient) -> None:
    shop = client.get("/api/v1/shop").json()
    items = {item["key"]: item for item in shop["items"]}
    assert items["heart_refill"]["price_gems"] == 350
    assert items["heart_refill"]["disabled_reason"] == "full"  # the learner starts with full hearts
    assert items["unlimited_hearts"]["disabled_reason"] == "coming_soon"
    assert items["streak_freeze"]["max_owned"] == 2


def test_streak_freezes_are_capped_at_two(client: TestClient) -> None:
    owned = client.get("/api/v1/shop").json()["items"]
    freeze = next(item for item in owned if item["key"] == "streak_freeze")
    for _ in range(2 - freeze["owned"]):
        assert (
            client.post("/api/v1/shop/purchases", json={"item_key": "streak_freeze"}).status_code
            == 200
        )
    capped = client.post("/api/v1/shop/purchases", json={"item_key": "streak_freeze"})
    assert capped.status_code == 409 and capped.json()["code"] == "max_owned"


def test_refill_needs_missing_hearts_and_enough_gems(client: TestClient, clock: FixedClock) -> None:
    full = client.post("/api/v1/hearts/refill", json={"context": "shop"})
    assert full.status_code == 409 and full.json()["code"] == "hearts_full"
    soon = client.post("/api/v1/shop/purchases", json={"item_key": "unlimited_hearts"})
    assert soon.status_code == 409 and soon.json()["code"] == "coming_soon"


def test_leaderboard_ranks_thirty_learners(client: TestClient) -> None:
    board = client.get("/api/v1/leaderboard").json()
    assert board["unlocked"] is True and board["name"] == "Silver"
    rows = board["rows"]
    assert len(rows) == 30
    assert [row["rank"] for row in rows] == list(range(1, 31))
    assert [row["xp"] for row in rows] == sorted((row["xp"] for row in rows), reverse=True)
    assert sum(row["is_me"] for row in rows) == 1
    assert rows[0]["zone"] == "promotion" and rows[-1]["zone"] == "demotion"


def test_rival_xp_is_deterministic(client: TestClient) -> None:
    first = client.get("/api/v1/leaderboard").json()["rows"]
    second = client.get("/api/v1/leaderboard").json()["rows"]
    assert first == second


def test_the_week_rolls_over_with_a_result_shown_once(
    client: TestClient, clock: FixedClock
) -> None:
    client.get("/api/v1/leaderboard")
    clock.advance(timedelta(days=7))
    board = client.get("/api/v1/leaderboard").json()
    assert board["last_result"] is not None
    assert board["last_result"]["outcome"] in ("promoted", "stayed", "demoted")
    assert client.get("/api/v1/leaderboard").json()["last_result"] is None


def test_profile_shows_statistics_and_achievements(client: TestClient) -> None:
    profile = client.get("/api/v1/profile").json()
    assert profile["stats"]["streak"] == 12
    assert profile["stats"]["league_name"] == "Silver"
    keys = [a["key"] for a in profile["achievements"]]
    assert {"wildfire", "sage"} <= set(keys)
    for achievement in profile["achievements"]:
        assert 0 <= achievement["level"] <= achievement["max_level"]


def test_quest_tracks_today_xp(client: TestClient, db: Session) -> None:
    before = client.get("/api/v1/quests").json()["daily"][0]
    assert before["progress"] == 0 and before["completed"] is False
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    solve_all(client, db, session)
    xp = complete(client, session["id"])["xp"]["total"]
    after = client.get("/api/v1/quests").json()["daily"][0]
    assert after["progress"] == min(xp, after["target"])
