"""GET /api/v1/streak/calendar: a month of streak days, the streak and its next goal."""

from datetime import timedelta
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.clock import FixedClock
from tests.integration.api.play import active_node, complete, solve_all, start

CALENDAR = "/api/v1/streak/calendar"


def statuses(body: dict[str, Any]) -> dict[int, str]:
    """Day of the month -> streak status."""
    return {int(day["date"][-2:]): day["status"] for day in body["days"]}


def test_the_current_month_shows_the_seeded_streak(client: TestClient) -> None:
    body = client.get(CALENDAR).json()
    assert body["month"] == "2026-10"
    assert body["today"] == "2026-10-09"
    assert body["current"] == 12 and body["extended_today"] is False
    assert body["longest"] >= 21
    assert body["goal"] == {"start": 7, "target": 14}
    days = statuses(body)
    assert len(days) == 31
    assert all(days[day] == "extended" for day in range(1, 9))  # the 12-day streak to yesterday
    assert days[9] == "pending"
    assert all(days[day] == "future" for day in range(10, 32))


def test_an_earlier_month_shows_both_streaks_and_the_gap(client: TestClient) -> None:
    body = client.get(CALENDAR, params={"month": "2026-09"}).json()
    assert body["month"] == "2026-09"
    days = statuses(body)
    assert len(days) == 30
    assert all(days[day] == "extended" for day in range(1, 10))  # the end of the 21-day streak
    assert all(days[day] == "missed" for day in range(10, 27))  # 17 days without practice
    assert all(days[day] == "extended" for day in range(27, 31))  # the current streak begins
    assert body["first_month"] <= "2026-08"  # the learner joined before the first streak


def test_frozen_days_and_a_lesson_today_are_shown(
    client: TestClient, db: Session, clock: FixedClock
) -> None:
    clock.advance(timedelta(days=1))  # 9 October missed: the one equipped freeze covers it
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    solve_all(client, db, session)
    complete(client, session["id"])

    body = client.get(CALENDAR).json()
    days = statuses(body)
    assert days[9] == "frozen"
    assert days[10] == "extended"
    assert body["extended_today"] is True
    assert body["current"] == 13 and body["freezes"] == 0


def test_the_month_must_be_a_valid_year_and_month(client: TestClient) -> None:
    for month in ("2026-13", "2026-1", "october"):
        response = client.get(CALENDAR, params={"month": month})
        assert response.status_code == 422
        assert response.json()["code"] == "invalid_request"


def test_the_calendar_needs_a_session(anonymous_client: TestClient) -> None:
    assert anonymous_client.get(CALENDAR).status_code == 401
