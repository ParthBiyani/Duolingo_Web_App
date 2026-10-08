"""Helpers that play sessions through the API the way the lesson player does."""

import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Exercise

Json = dict[str, Any]


def correct_answers(db: Session, exercise_id: int) -> list[Json]:
    """The answer payloads that solve an exercise (one per pair for match exercises)."""
    try:
        return _correct_answers(db, exercise_id)
    finally:
        db.rollback()  # end the read transaction so it does not hold SQLite's write lock


def _correct_answers(db: Session, exercise_id: int) -> list[Json]:
    exercise = db.get(Exercise, exercise_id)
    assert exercise is not None
    options = exercise.options
    kind = exercise.type
    if kind in ("multiple_choice", "image_choice", "fill_blank"):
        return [{"option_id": next(o.id for o in options if o.role == "choice" and o.is_correct)}]
    if kind == "translate_word_bank":
        tiles = sorted(
            (o for o in options if o.role == "tile" and o.answer_position is not None),
            key=lambda o: o.answer_position or 0,
        )
        return [{"tile_ids": [o.id for o in tiles]}]
    if kind in ("type_answer", "listen_type"):
        canonical = next(a for a in exercise.answers if a.is_canonical)
        return [{"text": canonical.text}]
    if kind == "match_pairs":
        right = {o.pair_key: o for o in options if o.role == "pair_right"}
        return [{"pair": [o.id, right[o.pair_key].id]} for o in options if o.role == "pair_left"]
    return [{"skipped": True}]  # speak


def wrong_answer(db: Session, exercise_id: int) -> Json:
    exercise = db.get(Exercise, exercise_id)
    assert exercise is not None
    option = next(o for o in exercise.options if o.role == "choice" and not o.is_correct)
    payload = {"option_id": option.id}
    db.rollback()
    return payload


def start(client: TestClient, kind: str, **ids: int) -> Json:
    response = client.post("/api/v1/sessions", json={"id": str(uuid.uuid4()), "kind": kind, **ids})
    assert response.status_code == 201, response.text
    return response.json()


def answer(client: TestClient, session_id: str, exercise_id: int, payload: Json) -> Json:
    response = client.post(
        f"/api/v1/sessions/{session_id}/answers",
        json={"answer_id": str(uuid.uuid4()), "exercise_id": exercise_id, "answer": payload},
    )
    assert response.status_code == 200, response.text
    return response.json()


def solve_all(client: TestClient, db: Session, session: Json) -> None:
    for exercise in session["exercises"]:
        for payload in correct_answers(db, exercise["id"]):
            result = answer(client, session["id"], exercise["id"], payload)
            assert result["correct"] or exercise["type"] == "speak", result


def complete(client: TestClient, session_id: str) -> Json:
    response = client.post(f"/api/v1/sessions/{session_id}/complete")
    assert response.status_code == 200, response.text
    return response.json()


def active_node(client: TestClient) -> Json:
    path = client.get("/api/v1/courses/current/path").json()
    return next(
        node
        for unit in path["units"]
        for node in unit["nodes"]
        if node["id"] == path["active_node_id"]
    )


def first_choice_exercise(session: Json) -> Json:
    return next(e for e in session["exercises"] if e["type"] in ("multiple_choice", "image_choice"))
