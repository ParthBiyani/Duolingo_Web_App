"""Every error is answered as RFC 9457 problem details with a stable ``code``."""

from collections.abc import Iterator
from typing import Literal

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from httpx import Response
from pydantic import BaseModel

from app.core.errors import AppError


class GoalUpdate(BaseModel):
    daily_goal_xp: Literal[1, 10, 20, 30, 50]


@pytest.fixture
def error_client(app: FastAPI) -> Iterator[TestClient]:
    """The app plus three routes that fail on purpose."""
    router = APIRouter(prefix="/api/test")

    @router.post("/hearts")
    def spend_a_heart() -> None:
        raise AppError(409, "no_hearts", "Out of hearts", "You have no hearts left.")

    @router.post("/goal")
    def set_goal(body: GoalUpdate) -> GoalUpdate:
        return body

    @router.get("/crash")
    def crash() -> None:
        raise RuntimeError("an unexpected bug")

    app.include_router(router)
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


def assert_problem(response: Response, status: int, code: str) -> dict[str, object]:
    assert response.status_code == status
    assert response.headers["content-type"] == "application/problem+json"
    body = response.json()
    assert body["type"] == "about:blank"
    assert body["status"] == status
    assert body["code"] == code
    assert isinstance(body["title"], str) and isinstance(body["detail"], str)
    return dict(body)


def test_app_errors_keep_their_code_title_and_detail(error_client: TestClient) -> None:
    body = assert_problem(error_client.post("/api/test/hearts"), 409, "no_hearts")
    assert (body["title"], body["detail"]) == ("Out of hearts", "You have no hearts left.")


def test_validation_errors_name_the_field(error_client: TestClient) -> None:
    response = error_client.post("/api/test/goal", json={"daily_goal_xp": 15})
    body = assert_problem(response, 422, "invalid_request")
    assert "body.daily_goal_xp" in str(body["detail"])
    assert body["errors"] == [
        {"loc": ["body", "daily_goal_xp"], "msg": "Input should be 1, 10, 20, 30 or 50",
         "type": "literal_error"}
    ]  # fmt: skip


def test_unknown_routes_are_not_found(error_client: TestClient) -> None:
    assert_problem(error_client.get("/api/nowhere"), 404, "not_found")


def test_wrong_methods_are_rejected(error_client: TestClient) -> None:
    response = error_client.delete("/api/health")
    assert_problem(response, 405, "method_not_allowed")
    assert response.headers["allow"] == "GET"


def test_unexpected_errors_hide_their_details(error_client: TestClient) -> None:
    body = assert_problem(error_client.get("/api/test/crash"), 500, "internal_error")
    assert "unexpected bug" not in str(body["detail"])
