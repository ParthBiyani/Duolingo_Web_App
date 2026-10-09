from app.seed.schema import load_units
from app.services.hints import Token, glossary, tokenize


def test_words_are_hinted_one_by_one_with_the_text_between_kept() -> None:
    assert tokenize("Hola, soy Pablo.") == [
        Token("Hola", "hello"),
        Token(", ", None),
        Token("soy", "I am"),
        Token(" ", None),
        Token("Pablo", None),  # names have no hint
        Token(".", None),
    ]


def test_set_phrases_are_hinted_together() -> None:
    assert tokenize("Buenos días, Marta.")[0] == Token("Buenos días", "good morning")
    assert tokenize("Quiero agua, por favor.")[-2] == Token("por favor", "please")


def test_article_and_noun_are_hinted_separately() -> None:
    assert tokenize("El perro") == [Token("El", "the"), Token(" ", None), Token("perro", "dog")]


def test_a_fill_in_gap_stays_plain_text() -> None:
    tokens = tokenize("Tengo ___ gato.")
    assert "".join(token.text for token in tokens) == "Tengo ___ gato."
    assert Token(" ___ ", None) in tokens


def test_every_taught_word_has_a_hint() -> None:
    words = glossary()
    for unit in load_units():
        for skill in unit.lesson_skills:
            for item in skill.vocab:
                assert all(token.hint for token in tokenize(item.es) if token.text.strip())
                assert item.es.casefold().split()[-1] in words or item.es.casefold() in words
