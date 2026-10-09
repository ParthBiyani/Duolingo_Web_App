"""Shared league cohorts: one live table for the learners in the same league and week."""

from collections.abc import Iterator
from datetime import timedelta
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.clock import FixedClock
from app.domain.leagues import COHORT_SIZE
from app.models import GemTransaction, LeagueCohort, LeagueMembership, User, XpEvent
from app.seed.learners import ISHA, KABIR, PARTH, ZOE
from tests.conftest import NOW, log_in
from tests.integration.api.play import active_node, complete, solve_all, start
from tests.integration.test_seed import TODAY

Json = dict[str, Any]
SILVER_WEEK = "2026-10-05"
NEXT_WEEK = "2026-10-12"

# Every transaction on ``db`` takes SQLite's write lock (BEGIN IMMEDIATE), so the helpers end
# their transaction before the test calls the API again.


@pytest.fixture
def other(app: FastAPI) -> Iterator[TestClient]:
    """A second browser, with its own session cookie."""
    with TestClient(app) as second:
        yield second


def board(client: TestClient) -> Json:
    response = client.get("/api/v1/leaderboard")
    assert response.status_code == 200, response.text
    body: Json = response.json()
    return body


def standings(rows: list[Json]) -> list[tuple[int, int, int]]:
    """The table without the viewer's highlight: (rank, user id, XP) per row."""
    return [(row["rank"], row["user_id"], row["xp"]) for row in rows]


def me(rows: list[Json]) -> list[str]:
    return [row["display_name"] for row in rows if row["is_me"]]


def user(db: Session, username: str) -> User:
    return db.scalars(select(User).where(User.username == username)).one()


def user_id(db: Session, username: str) -> int:
    found = user(db, username).id
    db.rollback()
    return found


def give_xp(db: Session, username: str, amount: int) -> None:
    """Record ``amount`` XP earned today, as a finished practice session would."""
    learner = user(db, username)
    db.add(
        XpEvent(user_id=learner.id, source="practice", amount=amount, occurred_at=NOW,
                local_date=TODAY)
    )  # fmt: skip
    learner.stats.xp_total += amount
    db.commit()


def cohort_of(db: Session, username: str, week: str) -> int | None:
    """The id of the learner's cohort in the week starting ``week``."""
    db.expire_all()
    found = db.scalar(
        select(LeagueCohort.id)
        .join(LeagueMembership)
        .where(LeagueMembership.user_id == user(db, username).id, LeagueCohort.week_start == week)
    )
    db.rollback()
    return found


def test_unlocked_learners_see_one_shared_table(client: TestClient, other: TestClient) -> None:
    parth = board(client)
    assert (parth["name"], parth["week_start"], len(parth["rows"])) == (
        "Silver",
        SILVER_WEEK,
        COHORT_SIZE,
    )
    assert me(parth["rows"]) == ["Parth Biyani"]
    names = {row["display_name"] for row in parth["rows"]}
    assert {"Parth Biyani", "Isha Nair", "Kabir Malhotra"} <= names

    for username, name in ((ISHA.username, "Isha Nair"), (KABIR.username, "Kabir Malhotra")):
        log_in(other, username)
        seen = board(other)
        assert (seen["name"], seen["week_start"]) == ("Silver", SILVER_WEEK)
        assert me(seen["rows"]) == [name]  # the same table, with their own row highlighted
        assert standings(seen["rows"]) == standings(parth["rows"])

    log_in(other, ZOE.username)
    locked = board(other)
    assert (locked["unlocked"], locked["rows"], locked["name"]) == (False, [], "Bronze")


def test_xp_one_learner_earns_shows_on_the_others_board(
    client: TestClient, other: TestClient, db: Session
) -> None:
    log_in(other, ISHA.username)
    parth_id = user_id(db, PARTH.username)
    before = next(row for row in board(other)["rows"] if row["user_id"] == parth_id)

    session = start(client, "lesson", lesson_id=active_node(client)["next_lesson_id"])
    solve_all(client, db, session)
    result = complete(client, session["id"])

    after = next(row for row in board(other)["rows"] if row["user_id"] == parth_id)
    assert after["xp"] == before["xp"] + result["xp"]["total"]
    assert after["is_me"] is False
    assert result["league"] == {"tier": 1, "name": "Silver", "rank": after["rank"]}


def test_a_learner_who_unlocks_joins_the_open_cohort_for_their_tier(
    client: TestClient, other: TestClient, db: Session
) -> None:
    before = {row["user_id"] for row in board(client)["rows"]}
    zoe = user(db, ZOE.username)
    zoe.stats.lessons_completed, zoe.stats.league_tier = 9, 1  # one lesson from unlocking
    db.commit()

    log_in(other, ZOE.username)
    session = start(other, "lesson", lesson_id=active_node(other)["next_lesson_id"])
    solve_all(other, db, session)
    assert complete(other, session["id"])["league"]["rank"] is not None

    shared = cohort_of(db, PARTH.username, SILVER_WEEK)
    assert shared is not None and cohort_of(db, ZOE.username, SILVER_WEEK) == shared
    assert db.scalar(select(func.count()).select_from(LeagueCohort)) == 1
    db.rollback()
    rows = board(client)["rows"]
    assert len(rows) == COHORT_SIZE  # Ananya took a rival's seat
    joined = {row["user_id"] for row in rows} - before
    assert joined == {user_id(db, ZOE.username)}
    assert me(board(other)["rows"]) == ["Ananya Iyer"]


def test_a_learner_in_another_league_gets_a_cohort_of_fresh_rivals(
    client: TestClient, other: TestClient, db: Session
) -> None:
    silver = {row["user_id"] for row in board(client)["rows"]}
    user(db, ZOE.username).stats.lessons_completed = 10  # unlocked, still in Bronze
    db.commit()

    log_in(other, ZOE.username)
    bronze = board(other)
    assert (bronze["unlocked"], bronze["name"], len(bronze["rows"])) == (True, "Bronze", 30)
    assert me(bronze["rows"]) == ["Ananya Iyer"]
    assert not {row["user_id"] for row in bronze["rows"]} & silver  # no rival in two tables
    assert len({row["display_name"] for row in bronze["rows"]}) == COHORT_SIZE


def test_a_demotion_keeps_the_champion_level_reached(other: TestClient, db: Session) -> None:
    def champion() -> Json:
        achievements = other.get("/api/v1/profile").json()["achievements"]
        found: Json = next(a for a in achievements if a["key"] == "champion")
        return found

    log_in(other, KABIR.username)  # reached Gold, then demoted to Silver last week
    assert champion()["level"] == 3
    session = start(other, "lesson", lesson_id=active_node(other)["next_lesson_id"])
    solve_all(other, db, session)
    result = complete(other, session["id"])  # re-evaluates every achievement
    assert "champion" not in {unlock["key"] for unlock in result["achievements"]}
    assert champion()["level"] == 3


def test_the_week_is_finalised_once_for_every_learner_in_it(
    client: TestClient, other: TestClient, db: Session, clock: FixedClock
) -> None:
    give_xp(db, PARTH.username, 5_000)  # first in Silver
    give_xp(db, ISHA.username, 4_000)  # second
    board(client)
    clock.advance(timedelta(days=7))

    parth_next = board(client)  # Parth's visit closes the week for all three of them
    assert parth_next["name"] == "Gold"
    assert parth_next["last_result"] == {
        "tier_before": 1, "tier_after": 2, "outcome": "promoted", "rank": 1, "gems": 25,
    }  # fmt: skip

    db.expire_all()
    old = db.scalars(select(LeagueCohort).where(LeagueCohort.week_start == SILVER_WEEK)).one()
    assert old.finalized_at is not None
    assert all(m.final_rank is not None and m.outcome is not None for m in old.memberships)
    isha, kabir = user(db, ISHA.username), user(db, KABIR.username)
    assert isha.stats.league_tier == 2  # promoted before she even came back
    kabir_seat = db.get(LeagueMembership, (old.id, kabir.id))
    assert kabir_seat is not None and kabir_seat.outcome is not None
    kabir_outcome = kabir_seat.outcome
    kabir_tier = {"promoted": 2, "stayed": 1, "demoted": 0}[kabir_outcome]
    assert kabir.stats.league_tier == kabir_tier
    ids = {user(db, PARTH.username).id, isha.id}
    db.rollback()

    log_in(other, ISHA.username)
    isha_next = board(other)  # promoted together, so she joins Parth's new Gold cohort
    assert (isha_next["last_result"]["rank"], isha_next["last_result"]["gems"]) == (2, 15)
    assert standings(isha_next["rows"]) == standings(board(client)["rows"])
    assert board(other)["last_result"] is None  # the result is shown once

    log_in(other, KABIR.username)
    kabir_next = board(other)
    assert kabir_next["tier"] == kabir_tier
    assert kabir_next["last_result"]["outcome"] == kabir_outcome
    assert board(client)["last_result"] is None  # nothing is finalised a second time

    db.expire_all()
    paid = db.execute(
        select(GemTransaction.user_id, func.count())
        .where(
            GemTransaction.reason == "league_reward",
            GemTransaction.ref == f"league:{SILVER_WEEK}",
        )
        .group_by(GemTransaction.user_id)
    ).all()
    counts = {row[0]: row[1] for row in paid}
    assert ids <= counts.keys() and set(counts.values()) == {1}  # each prize paid exactly once
    gold = cohort_of(db, PARTH.username, NEXT_WEEK)
    assert gold is not None and cohort_of(db, ISHA.username, NEXT_WEEK) == gold
    seats = db.scalar(
        select(func.count()).select_from(LeagueMembership).where(LeagueMembership.cohort_id == gold)
    )
    assert seats == COHORT_SIZE
