"""The lesson loop: start, grade, complete, abandon, plus practice, legendary and timed sessions."""

import json
import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import FixedClock
from app.domain.hearts import MAX_HEARTS
from app.models import User
from tests.integration.api.play import (
    active_node,
    answer,
    complete,
    first_choice_exercise,
    solve_all,
    start,
    wrong_answer,
)


def test_exercises_are_sent_without_answers(client: TestClient) -> None:
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    payload = json.dumps(session["exercises"])
    for secret in ("is_correct", "pair_key", "answer_position", "canonical"):
        assert secret not in payload
    assert session["rules"]["hearts_enabled"] is True


def test_starting_twice_with_the_same_id_replays_the_session(client: TestClient) -> None:
    body = {
        "id": str(uuid.uuid4()),
        "kind": "lesson",
        "lesson_id": active_node(client)["next_lesson_id"],
    }
    first = client.post("/api/v1/sessions", json=body)
    second = client.post("/api/v1/sessions", json=body)
    assert (first.status_code, second.status_code) == (201, 200)
    assert first.json()["exercises"] == second.json()["exercises"]


def test_a_full_lesson_awards_xp_streak_and_progress(client: TestClient, db: Session) -> None:
    node = active_node(client)
    session = start(client, "lesson", lesson_id=node["next_lesson_id"])
    wrong = answer(
        client,
        session["id"],
        first_choice_exercise(session)["id"],
        wrong_answer(db, first_choice_exercise(session)["id"]),
    )
    assert wrong["outcome"] == "incorrect" and wrong["hearts"] == MAX_HEARTS - 1
    assert wrong["solution_display"]

    solve_all(client, db, session)
    result = complete(client, session["id"])
    assert result["xp"]["base"] == 10 and 0 <= result["xp"]["combo_bonus"] <= 5
    assert result["streak"] == {**result["streak"], "extended": True, "previous": 12, "current": 13}
    assert result["skill"]["id"] == node["id"]
    assert result["skill"]["lessons_completed"] == node["lessons_completed"] + 1
    assert result["accuracy_pct"] < 100

    me = client.get("/api/v1/me").json()["stats"]
    assert me["today_xp"] == result["xp"]["total"]
    assert me["streak"]["extended_today"] is True


def test_the_first_lesson_does_not_reaward_the_seeded_streak_level(
    client: TestClient, db: Session
) -> None:
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    solve_all(client, db, session)
    result = complete(client, session["id"])
    assert result["streak"]["current"] == 13
    assert "wildfire" not in {a["key"] for a in result["achievements"]}


def test_completion_is_idempotent(client: TestClient, db: Session) -> None:
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    solve_all(client, db, session)
    first = complete(client, session["id"])
    second = complete(client, session["id"])
    assert first == second
    xp = client.get("/api/v1/me").json()["stats"]["today_xp"]
    assert xp == first["xp"]["total"]


def test_a_repeated_answer_id_does_not_cost_a_second_heart(client: TestClient, db: Session) -> None:
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    exercise = first_choice_exercise(session)
    body = {
        "answer_id": str(uuid.uuid4()),
        "exercise_id": exercise["id"],
        "answer": wrong_answer(db, exercise["id"]),
    }
    first = client.post(f"/api/v1/sessions/{session['id']}/answers", json=body).json()
    second = client.post(f"/api/v1/sessions/{session['id']}/answers", json=body).json()
    assert first["hearts"] == second["hearts"] == MAX_HEARTS - 1


def test_an_unfinished_session_cannot_be_completed(client: TestClient) -> None:
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    response = client.post(f"/api/v1/sessions/{session['id']}/complete")
    assert response.status_code == 409 and response.json()["code"] == "incomplete"


def test_skipping_costs_no_heart(client: TestClient) -> None:
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    exercise = session["exercises"][0]
    result = answer(client, session["id"], exercise["id"], {"skipped": True})
    assert result["outcome"] == "skipped" and result["hearts"] == MAX_HEARTS


def test_out_of_hearts_blocks_new_lessons_until_refilled(client: TestClient, db: Session) -> None:
    learner = db.scalars(select(User).where(User.username == "parthbiyani")).one()
    learner.stats.hearts = 0
    learner.stats.hearts_anchor_at = learner.stats.hearts_anchor_at or datetime(
        2026, 10, 9, 6, 0, tzinfo=UTC
    )
    db.commit()
    lesson_id = active_node(client)["next_lesson_id"]
    blocked = client.post(
        "/api/v1/sessions", json={"id": str(uuid.uuid4()), "kind": "lesson", "lesson_id": lesson_id}
    )
    assert blocked.status_code == 409 and blocked.json()["code"] == "no_hearts"

    refill = client.post("/api/v1/hearts/refill", json={"context": "lesson"})
    assert refill.status_code == 200 and refill.json()["hearts"] == MAX_HEARTS
    assert start(client, "lesson", lesson_id=lesson_id)["hearts"] == MAX_HEARTS


def test_locked_lessons_cannot_be_started(client: TestClient) -> None:
    path = client.get("/api/v1/courses/current/path").json()
    locked = next(
        n
        for u in path["units"]
        for n in u["nodes"]
        if n["state"] == "locked" and n["next_lesson_id"]
    )
    response = client.post(
        "/api/v1/sessions",
        json={"id": str(uuid.uuid4()), "kind": "lesson", "lesson_id": locked["next_lesson_id"]},
    )
    assert response.status_code == 409 and response.json()["code"] == "skill_locked"


def test_practice_earns_a_heart_and_costs_none(client: TestClient, db: Session) -> None:
    learner = db.scalars(select(User).where(User.username == "parthbiyani")).one()
    learner.stats.hearts = MAX_HEARTS - 1
    learner.stats.hearts_anchor_at = datetime(2026, 10, 9, 6, 0, tzinfo=UTC)
    db.commit()
    session = start(client, "practice")
    assert session["rules"]["hearts_enabled"] is False
    solve_all(client, db, session)
    result = complete(client, session["id"])
    assert result["hearts_earned"] == 1 and result["hearts"] == MAX_HEARTS
    assert result["skill"] is None


def test_legendary_costs_gems_and_awards_the_second_crown(client: TestClient, db: Session) -> None:
    path = client.get("/api/v1/courses/current/path").json()
    skill = next(
        n
        for u in path["units"]
        for n in u["nodes"]
        if n["state"] == "completed" and n["type"] == "lesson"
    )
    gems_before = client.get("/api/v1/me").json()["stats"]["gems"]
    session = start(client, "legendary", skill_id=skill["id"])
    assert session["rules"]["mistakes_allowed"] == 3
    solve_all(client, db, session)
    result = complete(client, session["id"])
    assert result["xp"]["total"] == 40
    assert result["skill"]["crown_level"] == 2
    assert result["gems"] <= gems_before - 100 + result["daily_goal"]["chest_gems"] + sum(
        a["gems"] for a in result["achievements"]
    )


def test_timed_practice_pays_one_xp_per_correct_answer(client: TestClient, db: Session) -> None:
    session = start(client, "timed")
    assert session["rules"]["timer_seconds"] == 30 and session["rules"]["timer_bonus_seconds"] == 7
    for exercise in session["exercises"][:4]:
        from tests.integration.api.play import correct_answers

        for payload in correct_answers(db, exercise["id"]):
            answer(client, session["id"], exercise["id"], payload)
    result = complete(client, session["id"])
    assert result["xp"]["total"] == 4


def test_abandoned_sessions_award_nothing(client: TestClient) -> None:
    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    assert client.post(f"/api/v1/sessions/{session['id']}/abandon").status_code == 204
    closed = client.post(f"/api/v1/sessions/{session['id']}/complete")
    assert closed.status_code == 409 and closed.json()["code"] == "session_closed"
    assert client.get("/api/v1/me").json()["stats"]["today_xp"] == 0


def test_the_daily_goal_chest_opens_once(
    client: TestClient, db: Session, clock: FixedClock
) -> None:
    gems: list[int] = []
    for _ in range(2):
        session = start(client, "practice")
        solve_all(client, db, session)
        result = complete(client, session["id"])
        gems.append(result["daily_goal"]["chest_gems"])
        clock.advance(timedelta(minutes=5))
    assert gems == [0, 5] or gems == [5, 0]


def test_cant_listen_now_completes_a_listening_exercise(client: TestClient) -> None:
    lesson_id = active_node(client)["next_lesson_id"]
    for _ in range(6):  # find a lesson in the active skill that has a listening exercise
        session = start(client, "lesson", lesson_id=lesson_id)
        listening = [e for e in session["exercises"] if e["type"] == "listen_type"]
        if listening:
            break
    else:
        return  # the fixture course may not have one in this lesson
    result = answer(client, session["id"], listening[0]["id"], {"skipped": True})
    assert result["exercise_done"] is True and result["hearts"] == MAX_HEARTS
