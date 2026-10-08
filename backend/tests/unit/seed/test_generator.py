"""The exercise generator: the planned lesson mix, the shape of each exercise, determinism."""

import random
from collections import Counter

import pytest

from app.domain.grading import grade_text
from app.seed.generator import (
    BLANK,
    PROMPT_TO_EN,
    PROMPT_TO_ES,
    Deck,
    ExerciseSpec,
    LessonSpec,
    lessons_for,
)
from app.seed.schema import UnitFile, load_units
from tests.conftest import CONTENT_DIR

LESSON_MIX = [
    Counter(image_choice=3, match_pairs=1, multiple_choice=2, translate_word_bank=2,
            fill_blank=1, type_answer=1),
    Counter(image_choice=1, match_pairs=1, translate_word_bank=2, fill_blank=2, type_answer=2,
            listen_type=1, multiple_choice=1),
    Counter(translate_word_bank=3, type_answer=2, listen_type=2, match_pairs=1, fill_blank=1,
            speak=1),
]  # fmt: skip


@pytest.fixture(scope="module")
def units() -> list[UnitFile]:
    return load_units(CONTENT_DIR)


@pytest.fixture(scope="module")
def lessons(units: list[UnitFile]) -> dict[str, list[LessonSpec]]:
    return {skill.slug: lessons_for(skill, unit) for unit in units for skill in unit.skills}


@pytest.fixture(scope="module")
def exercises(lessons: dict[str, list[LessonSpec]]) -> list[ExerciseSpec]:
    return [exercise for specs in lessons.values() for spec in specs for exercise in spec.exercises]


def of_type(exercises: list[ExerciseSpec], *types: str) -> list[ExerciseSpec]:
    return [exercise for exercise in exercises if exercise.type in types]


def test_every_node_gets_its_lessons(units: list[UnitFile], lessons: dict) -> None:
    expected = {"lesson": [10, 10, 10], "chest": [], "unit_review": [15]}
    for unit in units:
        for skill in unit.skills:
            assert [len(spec.exercises) for spec in lessons[skill.slug]] == expected[skill.type]


def test_lessons_follow_the_planned_mix(units: list[UnitFile], lessons: dict) -> None:
    for unit in units:
        for skill in unit.lesson_skills:
            mix = [Counter(e.type for e in spec.exercises) for spec in lessons[skill.slug]]
            assert mix == LESSON_MIX, skill.slug


def test_word_banks_translate_into_english_first_then_into_spanish(
    units: list[UnitFile], lessons: dict
) -> None:
    for unit in units:
        for skill in unit.lesson_skills:
            first, second, _third = lessons[skill.slug]
            assert {e.prompt for e in of_type(list(first.exercises), "translate_word_bank")} == {
                PROMPT_TO_EN
            }
            assert {e.prompt for e in of_type(list(second.exercises), "translate_word_bank")} == {
                PROMPT_TO_ES
            }


def test_only_the_first_lessons_pictures_are_new_words(
    units: list[UnitFile], lessons: dict
) -> None:
    for unit in units:
        for skill in unit.skills:
            for spec in lessons[skill.slug]:
                for exercise in spec.exercises:
                    first_picture = spec.position == 1 and exercise.type == "image_choice"
                    expected = first_picture and skill.type == "lesson"
                    assert exercise.is_new_word == expected


def test_choices_have_exactly_one_right_answer(exercises: list[ExerciseSpec]) -> None:
    for exercise in of_type(exercises, "image_choice", "multiple_choice", "fill_blank"):
        choices = [option for option in exercise.options if option.role == "choice"]
        assert [option.position for option in choices] == list(range(len(choices)))
        assert len({option.text for option in choices}) == len(choices)
        (correct,) = [option for option in choices if option.is_correct]
        if exercise.type == "fill_blank":
            assert 3 <= len(choices) <= 4
            assert exercise.source_text is not None and exercise.source_text.count(BLANK) == 1
            assert exercise.source_text.replace(BLANK, correct.text) == exercise.answers[0]
        else:
            assert len(choices) == 3
            assert exercise.answers == (correct.text,)


def test_picture_choices_show_emoji(exercises: list[ExerciseSpec]) -> None:
    for exercise in of_type(exercises, "image_choice"):
        assert exercise.prompt.startswith("Which one of these is \N{LEFT DOUBLE QUOTATION MARK}")
        assert all(option.image_key for option in exercise.options)
        assert len({option.image_key for option in exercise.options}) == 3


def test_meaning_choices_read_a_spanish_sentence(exercises: list[ExerciseSpec]) -> None:
    for exercise in of_type(exercises, "multiple_choice"):
        assert exercise.prompt == "Select the correct meaning"
        assert exercise.source_lang == "es"
        assert exercise.source_text == exercise.tts_text


def test_word_bank_tiles_build_the_answer_plus_two_or_three_extras(
    exercises: list[ExerciseSpec],
) -> None:
    for exercise in of_type(exercises, "translate_word_bank"):
        tiles = exercise.options
        assert {tile.role for tile in tiles} == {"tile"}
        assert sorted(tile.position for tile in tiles) == list(range(len(tiles)))
        answer = sorted(
            (tile for tile in tiles if tile.answer_position is not None),
            key=lambda tile: tile.answer_position or 0,
        )
        assert [tile.answer_position for tile in answer] == list(range(len(answer)))
        built = " ".join(tile.text for tile in answer)
        assert grade_text(built, exercise.answers).outcome == "correct"
        extras = [tile.text.casefold() for tile in tiles if tile.answer_position is None]
        assert 2 <= len(extras) <= 3
        accepted = " ".join(exercise.answers).casefold()
        assert not any(f" {extra} " in f" {accepted} " for extra in extras)


def test_match_pairs_have_five_pairs_in_shuffled_columns(exercises: list[ExerciseSpec]) -> None:
    for exercise in of_type(exercises, "match_pairs"):
        assert exercise.prompt == "Select the matching pairs"
        left = [option for option in exercise.options if option.role == "pair_left"]
        right = [option for option in exercise.options if option.role == "pair_right"]
        for column in (left, right):
            assert sorted(option.pair_key or 0 for option in column) == [1, 2, 3, 4, 5]
            assert sorted(option.position for option in column) == [0, 1, 2, 3, 4]
        assert exercise.answers == ()


def test_typed_answers_accept_the_alternatives(exercises: list[ExerciseSpec]) -> None:
    for exercise in of_type(exercises, "type_answer"):
        assert exercise.answers and len(set(exercise.answers)) == len(exercise.answers)
        if exercise.source_lang == "es":
            assert (exercise.prompt, exercise.tts_text) == (PROMPT_TO_EN, exercise.source_text)
        else:
            assert (exercise.prompt, exercise.tts_text) == (PROMPT_TO_ES, None)


def test_listening_and_speaking_use_the_spanish_sentence(exercises: list[ExerciseSpec]) -> None:
    for exercise in of_type(exercises, "listen_type"):
        assert exercise.prompt == "Type what you hear"
        assert exercise.source_text is None
        assert exercise.answers == (exercise.tts_text,)
    for exercise in of_type(exercises, "speak"):
        assert exercise.prompt == "Speak this sentence"
        assert exercise.answers == (exercise.source_text,) == (exercise.tts_text,)


def test_generation_is_deterministic(lessons: dict) -> None:
    again = {
        skill.slug: lessons_for(skill, unit)
        for unit in load_units(CONTENT_DIR)
        for skill in unit.skills
    }
    assert again == lessons


def test_each_skill_draws_from_its_own_seed(units: list[UnitFile]) -> None:
    unit = units[0]
    skill = unit.lesson_skills[0]
    renamed = skill.model_copy(update={"slug": "greetings-again"})
    assert lessons_for(renamed, unit) != lessons_for(skill, unit)


def test_a_deck_deals_everything_before_repeating() -> None:
    deck = Deck(["a", "b", "c"], random.Random(7))
    for _round in range(3):
        assert sorted(deck.draw() for _ in range(3)) == ["a", "b", "c"]


def test_words_without_pictures_are_taught_as_word_choices(units: list[UnitFile]) -> None:
    unit = units[0]
    skill = unit.lesson_skills[0]
    no_pictures = tuple(item.model_copy(update={"emoji": None}) for item in skill.vocab)
    plain = skill.model_copy(update={"vocab": no_pictures})
    new_words = lessons_for(plain, unit)[0].exercises[:3]
    assert [exercise.type for exercise in new_words] == ["multiple_choice"] * 3
    assert all(exercise.is_new_word for exercise in new_words)
    assert {exercise.source_text for exercise in new_words} <= {item.es for item in skill.vocab}
