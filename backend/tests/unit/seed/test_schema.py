"""Validation of the course content files."""

from pathlib import Path
from typing import Any

import pytest
import yaml
from pydantic import ValidationError

from app.seed.generator import lessons_for
from app.seed.schema import CONTENT_DIR as COURSE_CONTENT_DIR
from app.seed.schema import UnitFile, load_units
from tests.conftest import CONTENT_DIR


@pytest.fixture
def unit_data() -> dict[str, Any]:
    with (CONTENT_DIR / "unit_1.yaml").open(encoding="utf-8") as handle:
        data: dict[str, Any] = yaml.safe_load(handle)
    return data


def write_unit(folder: Path, name: str, data: dict[str, Any]) -> None:
    with (folder / name).open("w", encoding="utf-8") as handle:
        yaml.safe_dump(data, handle, allow_unicode=True)


def test_the_course_content_is_valid_and_builds_405_exercises() -> None:
    units = load_units(COURSE_CONTENT_DIR)
    assert [unit.unit.position for unit in units] == [1, 2, 3]
    exercises = sum(
        len(lesson.exercises)
        for unit in units
        for skill in unit.skills
        for lesson in lessons_for(skill, unit)
    )
    assert exercises == 405


def test_the_fixture_content_is_valid() -> None:
    assert [unit.unit.slug for unit in load_units(CONTENT_DIR)] == ["unit-1", "unit-2", "unit-3"]


def test_skills_must_follow_the_path_order(unit_data: dict[str, Any]) -> None:
    skills = unit_data["skills"]
    skills[2], skills[3] = skills[3], skills[2]
    with pytest.raises(ValidationError, match="order"):
        UnitFile.model_validate(unit_data)


def test_a_word_cannot_appear_twice_in_a_unit(unit_data: dict[str, Any]) -> None:
    unit_data["skills"][1]["vocab"][0]["es"] = "Hola"  # already in the first skill
    with pytest.raises(ValidationError, match="appears twice"):
        UnitFile.model_validate(unit_data)


@pytest.mark.parametrize("emoji", ["dog", "🐕 ", ""])
def test_emoji_must_be_a_single_glyph(unit_data: dict[str, Any], emoji: str) -> None:
    unit_data["skills"][0]["vocab"][0]["emoji"] = emoji
    with pytest.raises(ValidationError, match="emoji"):
        UnitFile.model_validate(unit_data)


@pytest.mark.parametrize("emoji", ["5️⃣", "🇪🇸", "👨‍👩‍👧", "🛏️"])
def test_keycap_flag_and_joined_emoji_are_accepted(unit_data: dict[str, Any], emoji: str) -> None:
    unit_data["skills"][0]["vocab"][0]["emoji"] = emoji
    UnitFile.model_validate(unit_data)


def test_lesson_skills_need_at_least_eight_words(unit_data: dict[str, Any]) -> None:
    del unit_data["skills"][0]["vocab"][7]
    with pytest.raises(ValidationError, match="at least 8"):
        UnitFile.model_validate(unit_data)


def test_unknown_fields_are_rejected(unit_data: dict[str, Any]) -> None:
    unit_data["skills"][2]["vocab"] = []  # the chest node has no vocabulary
    with pytest.raises(ValidationError, match="Extra inputs"):
        UnitFile.model_validate(unit_data)


def test_loading_needs_at_least_one_unit_file(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        load_units(tmp_path)


def test_unit_positions_must_run_from_one(tmp_path: Path, unit_data: dict[str, Any]) -> None:
    unit_data["unit"]["position"] = 2
    write_unit(tmp_path, "unit_1.yaml", unit_data)
    with pytest.raises(ValueError, match="positions"):
        load_units(tmp_path)


def test_slugs_must_be_unique_across_units(tmp_path: Path, unit_data: dict[str, Any]) -> None:
    write_unit(tmp_path, "unit_1.yaml", unit_data)
    unit_data["unit"]["position"] = 2
    write_unit(tmp_path, "unit_2.yaml", unit_data)
    with pytest.raises(ValueError, match="unique"):
        load_units(tmp_path)
