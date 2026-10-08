"""GET /api/v1/courses/current/path and POST /skills/{id}/chest."""

from fastapi.testclient import TestClient


def test_path_unlocks_in_order(client: TestClient) -> None:
    path = client.get("/api/v1/courses/current/path").json()
    states = [node["state"] for unit in path["units"] for node in unit["nodes"]]
    first_open = states.index("active")
    assert states.count("active") == 1
    assert all(state in ("completed", "legendary") for state in states[:first_open])
    assert all(state == "locked" for state in states[first_open + 1 :])


def test_active_node_reports_ring_progress_and_next_lesson(client: TestClient) -> None:
    path = client.get("/api/v1/courses/current/path").json()
    nodes = {node["id"]: node for unit in path["units"] for node in unit["nodes"]}
    active = nodes[path["active_node_id"]]
    assert active["lessons_completed"] == 1 and active["lessons_total"] == 3
    assert active["next_lesson_id"] is not None


def test_completed_skills_carry_crowns(client: TestClient) -> None:
    path = client.get("/api/v1/courses/current/path").json()
    unit_one = path["units"][0]["nodes"]
    crowns = {node["state"]: node["crown_level"] for node in unit_one if node["type"] == "lesson"}
    assert crowns.get("legendary") == 2
    assert crowns.get("completed") == 1


def test_chests_open_only_once_and_only_when_reached(client: TestClient) -> None:
    path = client.get("/api/v1/courses/current/path").json()
    chests = [node for unit in path["units"] for node in unit["nodes"] if node["type"] == "chest"]
    opened, locked = chests[0], chests[1]
    assert opened["chest_claimed"] is True

    again = client.post(f"/api/v1/skills/{opened['id']}/chest")
    assert again.status_code == 409 and again.json()["code"] == "already_claimed"
    early = client.post(f"/api/v1/skills/{locked['id']}/chest")
    assert early.status_code == 409 and early.json()["code"] == "skill_locked"
    missing = client.post("/api/v1/skills/999999/chest")
    assert missing.status_code == 404
