"""League rivals: the n-th rival is always the same simulated learner."""

import re

import pytest

from app.domain.rivals import RIVAL_NAMES, RIVAL_PACES, rival


def test_the_first_rivals_use_each_name_once_with_every_pace() -> None:
    first = [rival(number) for number in range(len(RIVAL_NAMES))]
    assert [r.display_name for r in first[:2]] == ["Maya R.", "Liam K."]
    assert first[21].username == "tomas_q"  # accents dropped
    assert sorted(r.pace_xp for r in first) == sorted(RIVAL_PACES)
    assert all(re.fullmatch(r"\w+ [A-Z]\.", r.display_name) for r in first)


def test_later_rivals_take_the_next_initial_and_never_repeat_a_username() -> None:
    assert rival(len(RIVAL_NAMES)).display_name == "Maya S."
    assert rival(len(RIVAL_NAMES)).pace_xp == rival(0).pace_xp
    usernames = [rival(number).username for number in range(len(RIVAL_NAMES) * 30)]
    assert len(set(usernames)) == len(usernames)
    assert all(3 <= len(name) <= 30 for name in usernames)  # the users table's limits


def test_rivals_are_deterministic() -> None:
    assert rival(57) == rival(57)


def test_rival_numbers_start_at_zero() -> None:
    with pytest.raises(ValueError, match="start at 0"):
        rival(-1)
