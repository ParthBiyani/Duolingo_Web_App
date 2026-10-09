import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Answer, Exercise } from "@/lib/api";

import type { MatchState } from "../reducer";
import { lessonStrings } from "../strings";
import { makeExercise, makeResult } from "../test-fixtures";
import { exerciseRegistry } from "./registry";
import type { ExerciseProps } from "./types";

const EMPTY_MATCH: MatchState = { left: null, right: null, matched: [], wrong: null, flashKey: 0 };

function setup(exercise: Exercise, overrides: Partial<ExerciseProps> = {}) {
  const props: ExerciseProps = {
    exercise,
    draft: null,
    onDraft: vi.fn(),
    locked: false,
    result: null,
    match: EMPTY_MATCH,
    onMatchSelect: vi.fn(),
    onMatchFlashEnd: vi.fn(),
    onSkipSilently: vi.fn(),
    autoplayAudio: false,
    ...overrides,
  };
  const Component = exerciseRegistry[exercise.type];
  const view = render(<Component {...props} />);
  const rerender = (next: Partial<ExerciseProps>) => {
    Object.assign(props, next);
    view.rerender(<Component {...props} />);
  };
  return { props, rerender };
}

/** The text a learner reads in `element`: closed hint tooltips left out. */
function readText(element: Element | null): string {
  const copy = element?.cloneNode(true) as Element | undefined;
  copy?.querySelectorAll("[role='tooltip']").forEach((tooltip) => tooltip.remove());
  return copy?.textContent ?? "";
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("registry", () => {
  it("has a component for every exercise type", () => {
    expect(Object.keys(exerciseRegistry).sort()).toEqual(
      [
        "fill_blank",
        "image_choice",
        "listen_type",
        "match_pairs",
        "multiple_choice",
        "speak",
        "translate_word_bank",
        "type_answer",
      ].sort(),
    );
  });
});

describe("choice exercises", () => {
  it("multiple choice: shows the bubble and picks by click or number key", async () => {
    const user = userEvent.setup();
    const { props } = setup(makeExercise(1, "multiple_choice"));
    const word = screen.getByRole("button", { name: "gato" });
    expect(readText(word.closest("[lang='es']"))).toBe("el gato");

    await user.click(screen.getByRole("button", { name: /the dog/ }));
    expect(props.onDraft).toHaveBeenLastCalledWith({ option_id: 12 });
    await user.keyboard("3");
    expect(props.onDraft).toHaveBeenLastCalledWith({ option_id: 13 });
    await user.keyboard("9"); // no ninth option
    expect(props.onDraft).toHaveBeenCalledTimes(2);
  });

  it("marks the chosen option and ignores input while locked", async () => {
    const user = userEvent.setup();
    const { props } = setup(makeExercise(1, "multiple_choice"), {
      draft: { option_id: 11 },
      locked: true,
    });
    expect(screen.getByRole("button", { name: /the cat/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /the dog/ }));
    await user.keyboard("2");
    expect(props.onDraft).not.toHaveBeenCalled();
  });

  it("image choice: picture cards with labels", async () => {
    const user = userEvent.setup();
    const exercise: Exercise = {
      ...makeExercise(2, "image_choice"),
      options: [
        { id: 1, text: "el café", image: "☕" },
        { id: 2, text: "el agua", image: "💧" },
        { id: 3, text: "la leche", image: "🥛" },
      ],
    };
    const { props } = setup(exercise);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    await user.keyboard("2");
    expect(props.onDraft).toHaveBeenLastCalledWith({ option_id: 2 });
  });

  it("fill in the blank: the chosen option fills the gap", () => {
    const exercise: Exercise = {
      ...makeExercise(3, "fill_blank"),
      source_text: "Yo ___ café.",
      options: [
        { id: 31, text: "bebo", image: null },
        { id: 32, text: "como", image: null },
      ],
    };
    const { rerender } = setup(exercise);
    expect(screen.getByText(lessonStrings.blank)).toBeInTheDocument();
    rerender({ draft: { option_id: 31 } });
    const sentence = screen.getByText(/Yo/);
    expect(sentence).toHaveTextContent("Yo bebo café.");
  });

  it("fill in the blank: hinted words around the gap", () => {
    const exercise: Exercise = {
      ...makeExercise(3, "fill_blank"),
      source_text: "Yo ___ café.",
      source_tokens: [
        { text: "Yo", hint: "I", is_new: false },
        { text: " ___ ", hint: null, is_new: false },
        { text: "café", hint: "coffee", is_new: false },
        { text: ".", hint: null, is_new: false },
      ],
    };
    setup(exercise, { draft: { option_id: 31 } });
    const sentence = screen.getByRole("button", { name: "Yo" }).closest("p");
    expect(readText(sentence)).toBe("Yo the cat café.");
  });

  it("turns the chosen card green when correct and red when wrong", () => {
    const exercise = makeExercise(1, "multiple_choice");
    const graded = { ...makeResult(), outcome: "correct" as const, correct: true };
    const { rerender } = setup(exercise, {
      draft: { option_id: 11 },
      locked: true,
      result: graded,
    });
    const chosen = screen.getByRole("button", { name: /the cat/ });
    expect(chosen).toHaveClass("border-feedback-correct-text");
    expect(screen.getByRole("button", { name: /the dog/ })).toHaveClass("border-border");
    rerender({ result: { ...graded, outcome: "incorrect", correct: false } });
    expect(chosen).toHaveClass("border-feedback-wrong-text");
  });
});

describe("word hints", () => {
  const exercise = {
    ...makeExercise(1, "multiple_choice"),
    source_tokens: [
      { text: "el", hint: "the", is_new: false },
      { text: " ", hint: null, is_new: false },
      { text: "gato", hint: "cat", is_new: true },
    ],
  };

  it("shows a word's meaning on hover and keyboard focus, and Escape hides it", async () => {
    const user = userEvent.setup();
    setup(exercise);
    const word = screen.getByRole("button", { name: "gato" });
    expect(word).toHaveClass("text-purple"); // the new word
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.hover(word);
    expect(screen.getByRole("tooltip")).toHaveTextContent("cat");
    expect(word).toHaveAccessibleDescription("cat");
    await user.unhover(word);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab(); // the speaker button
    await user.tab(); // "el"
    expect(screen.getByRole("tooltip")).toHaveTextContent("the");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("a tap pins the meaning open until tapped again", async () => {
    const user = userEvent.setup();
    setup(exercise);
    const word = screen.getByRole("button", { name: "el" });
    fireEvent.click(word);
    expect(screen.getByRole("tooltip")).toHaveTextContent("the");
    await user.click(document.body);
    fireEvent.click(word);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("falls back to plain text when the tokens do not spell the sentence", () => {
    setup({ ...exercise, source_text: "el perro" });
    expect(screen.getByText("el perro")).toBeVisible();
    expect(screen.queryByRole("button", { name: "gato" })).not.toBeInTheDocument();
  });
});

describe("word bank", () => {
  const exercise = makeExercise(4, "translate_word_bank"); // tiles 41 "the", 42 "cat", 43 "dog"

  it("adds tiles by click or number key and keeps a placeholder in the bank", async () => {
    const user = userEvent.setup();
    const { props, rerender } = setup(exercise);
    const bank = screen.getByRole("group", { name: lessonStrings.wordBankLabel });

    await user.click(screen.getByRole("button", { name: "the" }));
    expect(props.onDraft).toHaveBeenLastCalledWith({ tile_ids: [41] });

    rerender({ draft: { tile_ids: [41] } });
    const answer = screen.getByRole("group", { name: lessonStrings.answerLabel });
    expect(answer).toHaveTextContent("the");
    // The bank keeps a grey slot for the moved tile but no button for it.
    expect(bank).toHaveTextContent("the");
    expect(screen.getAllByRole("button", { name: "the" })).toHaveLength(1);

    await user.keyboard("2");
    expect(props.onDraft).toHaveBeenLastCalledWith({ tile_ids: [41, 42] });
    await user.keyboard("1"); // already used
    expect(props.onDraft).toHaveBeenCalledTimes(2);
  });

  it("removes a tile when tapped in the answer and the last one with Backspace", async () => {
    const user = userEvent.setup();
    const { props } = setup(exercise, { draft: { tile_ids: [42, 41] } });
    const answer = screen.getByRole("group", { name: lessonStrings.answerLabel });

    await user.click(answer.querySelector("button") as HTMLButtonElement);
    expect(props.onDraft).toHaveBeenLastCalledWith({ tile_ids: [41] });
    await user.keyboard("{Backspace}");
    expect(props.onDraft).toHaveBeenLastCalledWith({ tile_ids: [42] });
  });
});

describe("match pairs", () => {
  const exercise = makeExercise(5, "match_pairs"); // left 101 hola, 102 gato; right 201 cat, 202 hello

  it("maps 1.. to the left column and the following numbers to the right", async () => {
    const user = userEvent.setup();
    const { props } = setup(exercise);
    await user.keyboard("2");
    expect(props.onMatchSelect).toHaveBeenLastCalledWith("left", 102);
    await user.keyboard("4");
    expect(props.onMatchSelect).toHaveBeenLastCalledWith("right", 202);
    await user.click(screen.getByRole("button", { name: /cat/ }));
    expect(props.onMatchSelect).toHaveBeenLastCalledWith("right", 201);
  });

  it("shows selection, disables matched tiles and clears a rejected pair after the flash", () => {
    vi.useFakeTimers();
    const { props } = setup(exercise, {
      match: { left: 101, right: null, matched: [102, 201], wrong: null, flashKey: 0 },
    });
    expect(screen.getByRole("button", { name: /hola/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /gato/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cat/ })).toBeDisabled();

    cleanup();
    const flashing = setup(exercise, {
      match: { left: null, right: null, matched: [], wrong: [101, 201], flashKey: 3 },
    });
    expect(screen.getByRole("button", { name: /hola/ })).toHaveClass("animate-shake");
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(flashing.props.onMatchFlashEnd).toHaveBeenCalledWith(3);
    expect(props.onMatchFlashEnd).not.toHaveBeenCalled();
  });
});

describe("typed answers", () => {
  it("type answer: asks for the other language and reports text", () => {
    const { props } = setup({ ...makeExercise(6, "type_answer"), source_lang: "es" });
    const box = screen.getByRole("textbox", { name: lessonStrings.answerLabel });
    expect(box).toHaveAttribute("placeholder", lessonStrings.typeIn.en);
    expect(box).toHaveFocus();
    fireEvent.change(box, { target: { value: "the cat" } });
    expect(props.onDraft).toHaveBeenLastCalledWith({ text: "the cat" } satisfies Answer);
  });

  it("listen and type: Spanish answer box and a penalty-free skip", async () => {
    const user = userEvent.setup();
    const { props } = setup({ ...makeExercise(7, "listen_type"), source_text: null });
    expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", lessonStrings.typeIn.es);
    expect(screen.getByRole("button", { name: lessonStrings.playAudio })).toBeVisible();
    await user.click(screen.getByRole("button", { name: lessonStrings.cantListen }));
    expect(props.onSkipSilently).toHaveBeenCalledTimes(1);
  });

  it("speak: microphone is coming soon and can't-speak-now moves on", async () => {
    const user = userEvent.setup();
    const { props } = setup(makeExercise(8, "speak"));
    expect(screen.getByRole("button", { name: lessonStrings.tapToSpeak })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: lessonStrings.cantSpeak }));
    expect(props.onSkipSilently).toHaveBeenCalledTimes(1);
  });
});
