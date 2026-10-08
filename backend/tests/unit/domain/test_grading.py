import pytest

from app.domain.grading import (
    TYPO_MIN_LENGTH,
    GradeOutcome,
    GradeResult,
    damerau_levenshtein,
    grade_text,
    normalize,
    strip_accents,
)

HOLA = ("Hola, soy Ana.", "Hola, yo soy Ana.")
COMO = ("¿Cómo estás?",)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        pytest.param("Hola", "hola", id="lowercase"),
        pytest.param("Hola, soy Ana.", "hola soy ana", id="comma-and-full-stop"),
        pytest.param("¿Cómo estás?", "cómo estás", id="spanish-question-marks"),
        pytest.param("¡Buenos días!", "buenos días", id="spanish-exclamation-marks"),
        pytest.param('Ella dijo: "sí"; yo no.', "ella dijo sí yo no", id="colon-semicolon-quotes"),
        pytest.param("I'm Ana", "im ana", id="apostrophe"),
        pytest.param("I\N{RIGHT SINGLE QUOTATION MARK}m Ana", "im ana", id="curly-apostrophe"),
        pytest.param(
            "\N{LEFT DOUBLE QUOTATION MARK}Hola\N{RIGHT DOUBLE QUOTATION MARK}",
            "hola",
            id="curly-quotes",
        ),
        pytest.param(
            "\N{LEFT-POINTING DOUBLE ANGLE QUOTATION MARK}Hola"
            "\N{RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK}",
            "hola",
            id="guillemets",
        ),
        pytest.param("  hola \t  ana \n", "hola ana", id="whitespace-collapsed"),
        pytest.param("hola\N{NO-BREAK SPACE}ana", "hola ana", id="no-break-space"),
        pytest.param("\N{FULLWIDTH LATIN CAPITAL LETTER H}ola", "hola", id="full-width-letter"),
        pytest.param("Espera\N{HORIZONTAL ELLIPSIS}", "espera", id="ellipsis-character"),
        pytest.param(
            "cafe\N{COMBINING ACUTE ACCENT}",
            "caf\N{LATIN SMALL LETTER E WITH ACUTE}",
            id="decomposed-accent-composed",
        ),
        pytest.param("?!", "", id="only-punctuation"),
        pytest.param("", "", id="empty"),
    ],
)
def test_normalize(text: str, expected: str) -> None:
    assert normalize(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("canción", "cancion"),
        ("niño", "nino"),
        ("pingüino", "pinguino"),
        ("ÁÉÍÓÚ", "AEIOU"),
        ("hello", "hello"),
        ("", ""),
    ],
)
def test_strip_accents(text: str, expected: str) -> None:
    assert strip_accents(text) == expected


@pytest.mark.parametrize(
    ("a", "b", "distance"),
    [
        pytest.param("", "", 0, id="both-empty"),
        pytest.param("", "abc", 3, id="from-empty"),
        pytest.param("hola", "hola", 0, id="equal"),
        pytest.param("hola", "hila", 1, id="substitution"),
        pytest.param("hola", "hoola", 1, id="insertion"),
        pytest.param("hola", "hla", 1, id="deletion"),
        pytest.param("hola", "hloa", 1, id="adjacent-swap"),
        pytest.param("gato", "tago", 2, id="distant-swap"),
        pytest.param("kitten", "sitting", 3, id="several-edits"),
    ],
)
def test_damerau_levenshtein(a: str, b: str, distance: int) -> None:
    assert damerau_levenshtein(a, b) == distance
    assert damerau_levenshtein(b, a) == distance


@pytest.mark.parametrize(
    ("answer", "accepted", "outcome"),
    [
        # Case, punctuation and spacing never matter.
        pytest.param("Hola, soy Ana.", HOLA, "correct", id="exact"),
        pytest.param("hola soy ana", HOLA, "correct", id="no-capitals-or-punctuation"),
        pytest.param("HOLA SOY ANA", HOLA, "correct", id="all-capitals"),
        pytest.param("  Hola ,soy  Ana!! ", HOLA, "correct", id="messy-spacing"),
        pytest.param("¿Cómo estás?", COMO, "correct", id="inverted-question-mark"),
        pytest.param("Cómo estás", COMO, "correct", id="inverted-question-mark-left-out"),
        pytest.param("¡¡Buenos días!!", ("¡Buenos días!",), "correct", id="extra-exclamations"),
        pytest.param("I\N{RIGHT SINGLE QUOTATION MARK}m Ana", ("I'm Ana",), "correct", id="curly"),
        # Any accepted answer counts, and an exact alternative beats a typo of the first one.
        pytest.param("Hola, yo soy Ana.", HOLA, "correct", id="alternative"),
        pytest.param("Thanks", ("Thank you", "Thanks"), "correct", id="short-alternative"),
        pytest.param(
            "hola soy anna", ("Hola, soy Ana.", "Hola, soy Anna."), "correct", id="exact-wins"
        ),
        # Accents alone only ever make a typo, whatever the length.
        pytest.param("como estas", COMO, "typo", id="missing-accents"),
        pytest.param("nino", ("niño",), "typo", id="missing-tilde"),
        pytest.param("si", ("sí",), "typo", id="short-word-missing-accent"),
        pytest.param("Téngo un gato", ("Tengo un gato",), "typo", id="extra-accent"),
        # One slip in texts of five or more characters is a typo.
        pytest.param("Hola, soy Anna.", HOLA, "typo", id="extra-letter"),
        pytest.param("Hola, soi Ana.", HOLA, "typo", id="wrong-letter"),
        pytest.param("Hola, sy Ana.", HOLA, "typo", id="missing-letter"),
        pytest.param("prero", ("perro",), "typo", id="swapped-letters"),
        pytest.param("perrro", ("perro",), "typo", id="five-letter-word"),
        pytest.param("cancoin", ("canción",), "typo", id="slip-and-missing-accent"),
        pytest.param("hola yo sot ana", HOLA, "typo", id="slip-in-alternative"),
        # Short words get no leniency: one letter turns them into another word.
        pytest.param("gata", ("gato",), "incorrect", id="short-word-wrong-letter"),
        pytest.param("gatos", ("gato",), "incorrect", id="short-word-extra-letter"),
        pytest.param("pero", ("perro",), "incorrect", id="answer-too-short-for-leniency"),
        pytest.param("una", ("uno",), "incorrect", id="three-letter-word"),
        # Anything further away is wrong.
        pytest.param("bibliotaco", ("biblioteca",), "incorrect", id="two-slips"),
        pytest.param("Hola, soy Eva.", HOLA, "incorrect", id="different-word"),
        pytest.param("Adiós", HOLA, "incorrect", id="unrelated"),
        pytest.param("", HOLA, "incorrect", id="empty"),
        pytest.param("?!", HOLA, "incorrect", id="only-punctuation"),
    ],
)
def test_grade_text(answer: str, accepted: tuple[str, ...], outcome: GradeOutcome) -> None:
    assert grade_text(answer, accepted) == GradeResult(outcome=outcome, canonical=accepted[0])


@pytest.mark.parametrize("answer", ["Thanks", "thnaks", "Cheers"])
def test_the_solution_shown_is_always_the_first_accepted_answer(answer: str) -> None:
    assert grade_text(answer, ["Thank you", "Thanks"]).canonical == "Thank you"


def test_word_bank_tiles_are_graded_like_typed_text() -> None:
    tiles = ["Hola", "soy", "Ana"]
    assert grade_text(" ".join(tiles), HOLA).outcome == "correct"


def test_typo_leniency_starts_at_five_characters() -> None:
    assert TYPO_MIN_LENGTH == 5
    assert grade_text("casi", ["casa"]).outcome == "incorrect"
    assert grade_text("casas", ["cosas"]).outcome == "typo"


def test_grade_text_needs_an_accepted_answer() -> None:
    with pytest.raises(ValueError, match="at least one"):
        grade_text("hola", [])


def test_grade_text_rejects_a_single_string_as_the_accepted_answers() -> None:
    with pytest.raises(TypeError, match="not a single string"):
        grade_text("hola", "hola")
