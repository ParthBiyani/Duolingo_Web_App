import { describe, expect, it } from "vitest";

import type { AnswerResult, Exercise, ExerciseType, SessionKind } from "@/lib/api";

import {
  buildCelebrateSteps,
  canCheck,
  canSkip,
  comboLabel,
  createInitialState,
  currentExercise,
  currentItem,
  isFatal,
  isInteractive,
  lessonProgress,
  lessonReducer,
  type LessonEvent,
  type LessonState,
} from "./reducer";
import {
  CORRECT,
  makeCompletion,
  makeExercise,
  makeResult,
  makeSession,
  makeSessionOfKind,
  wrong,
} from "./test-fixtures";

// ---------------------------------------------------------------------------------------------
// Helpers

let idSeq = 0;
const nextId = () => `answer-${++idSeq}`;

function run(state: LessonState, ...events: LessonEvent[]): LessonState {
  return events.reduce(lessonReducer, state);
}

function exercises(count: number, type: ExerciseType = "multiple_choice"): Exercise[] {
  return Array.from({ length: count }, (_, i) => makeExercise(i + 1, type));
}

function start(list: Exercise[], kind: SessionKind = "lesson", motivational = true): LessonState {
  const session = kind === "lesson" ? makeSession(list) : makeSessionOfKind(kind, list);
  return lessonReducer(createInitialState(kind, motivational), { type: "LOADED", session });
}

/** Drafts an answer, presses CHECK and applies the server result. */
function check(state: LessonState, result: AnswerResult, roll = 0): LessonState {
  const answerId = nextId();
  return run(
    state,
    { type: "DRAFT", answer: { option_id: 1 } },
    { type: "CHECK", answerId },
    { type: "RESULT", answerId, result, roll },
  );
}

function cont(state: LessonState, roll = 0): LessonState {
  return lessonReducer(state, { type: "CONTINUE", roll });
}

/** Answers the current item correctly and continues past feedback (and any interstitial). */
function passCurrent(state: LessonState): LessonState {
  let next = cont(check(state, CORRECT));
  if (next.phase === "interstitial") next = cont(next);
  return next;
}

function skip(state: LessonState, result: AnswerResult, silent = false): LessonState {
  const answerId = nextId();
  return run(state, { type: "SKIP", answerId, silent }, { type: "RESULT", answerId, result });
}

function selectPair(state: LessonState, left: number, right: number, result: AnswerResult) {
  const answerId = nextId();
  return run(
    state,
    { type: "MATCH_SELECT", side: "left", tileId: left, answerId: nextId() },
    { type: "MATCH_SELECT", side: "right", tileId: right, answerId },
    { type: "MATCH_RESULT", answerId, result },
  );
}

const SKIPPED = makeResult({ outcome: "skipped", correct: false, exercise_done: false });

// ---------------------------------------------------------------------------------------------

describe("initial state and loading", () => {
  it("starts loading with the route's kind and the motivational setting", () => {
    const state = createInitialState("practice", false);
    expect(state.phase).toBe("loading");
    expect(state.kind).toBe("practice");
    expect(state.motivational).toBe(false);
    expect(state.modal).toBeNull();
    expect(currentExercise(state)).toBeNull();
    expect(lessonProgress(state)).toBe(0);
  });

  it("builds the queue from the server plan in order", () => {
    const state = start(exercises(3));
    expect(state.phase).toBe("answering");
    expect(state.queue.map((item) => item.exerciseId)).toEqual([1, 2, 3]);
    expect(state.queue.every((item) => !item.previousMistake)).toBe(true);
    expect(new Set(state.queue.map((item) => item.key)).size).toBe(3);
    expect(state.totalCount).toBe(3);
    expect(state.hearts).toBe(5);
    expect(state.heartsMax).toBe(5);
    expect(state.mistakesLeft).toBeNull();
    expect(state.timeLeftMs).toBeNull();
    expect(currentExercise(state)?.id).toBe(1);
    expect(currentItem(state)?.key).toBe("1:0");
  });

  it("goes straight to completing when the plan is empty", () => {
    expect(start([]).phase).toBe("completing");
  });

  it("ignores LOADED once the session is running", () => {
    const state = start(exercises(2));
    const again = lessonReducer(state, { type: "LOADED", session: makeSession(exercises(5)) });
    expect(again).toBe(state);
  });

  it("shows a retryable error when the session fails to start", () => {
    const failed = lessonReducer(createInitialState("lesson"), {
      type: "LOAD_FAILED",
      error: { code: "network", status: 0, message: "offline" },
    });
    expect(failed.phase).toBe("loading");
    expect(failed.error?.code).toBe("network");
    expect(failed.modal).toBeNull();

    const retried = lessonReducer(failed, { type: "RETRY" });
    expect(retried.error).toBeNull();
    expect(retried.attempt).toBe(failed.attempt + 1);
  });

  it("ignores RETRY when there is no error", () => {
    const state = createInitialState("lesson");
    expect(lessonReducer(state, { type: "RETRY" })).toBe(state);
  });

  it("opens the out-of-hearts modal when the start is refused for no hearts", () => {
    const blocked = lessonReducer(createInitialState("lesson"), {
      type: "LOAD_FAILED",
      error: { code: "no_hearts", status: 409, message: "No hearts" },
    });
    expect(blocked.modal).toBe("outOfHearts");
    expect(blocked.resumeAfterRefill).toBe("start");

    const refilled = lessonReducer(blocked, { type: "REFILLED", hearts: 5 });
    expect(refilled.modal).toBeNull();
    expect(refilled.hearts).toBe(5);
    expect(refilled.error).toBeNull();
    expect(refilled.phase).toBe("loading");
    expect(refilled.attempt).toBe(blocked.attempt + 1);
  });

  it("leaves to practice or the path from a refused start", () => {
    const blocked = lessonReducer(createInitialState("lesson"), {
      type: "LOAD_FAILED",
      error: { code: "no_hearts", status: 409, message: "No hearts" },
    });
    expect(lessonReducer(blocked, { type: "PRACTICE" })).toMatchObject({
      phase: "done",
      exit: "practice",
      modal: null,
    });
    expect(lessonReducer(blocked, { type: "NO_THANKS" })).toMatchObject({
      phase: "done",
      exit: "no-thanks",
    });
  });

  it("closing while loading exits immediately", () => {
    const state = lessonReducer(createInitialState("lesson"), { type: "QUIT_OPEN" });
    expect(state).toMatchObject({ phase: "done", exit: "quit", modal: null });
  });
});

describe("drafting and checking", () => {
  it("enables CHECK only for a complete draft", () => {
    let state = start([makeExercise(1, "translate_word_bank")]);
    expect(canCheck(state)).toBe(false);
    state = lessonReducer(state, { type: "DRAFT", answer: { tile_ids: [] } });
    expect(canCheck(state)).toBe(false);
    state = lessonReducer(state, { type: "DRAFT", answer: { tile_ids: [11] } });
    expect(canCheck(state)).toBe(true);
    state = lessonReducer(state, { type: "DRAFT", answer: null });
    expect(canCheck(state)).toBe(false);
  });

  it("treats whitespace-only text as empty", () => {
    let state = start([makeExercise(1, "type_answer")]);
    state = lessonReducer(state, { type: "DRAFT", answer: { text: "   " } });
    expect(canCheck(state)).toBe(false);
    state = lessonReducer(state, { type: "DRAFT", answer: { text: " hola " } });
    expect(canCheck(state)).toBe(true);
  });

  it("ignores CHECK without a ready draft", () => {
    const state = start(exercises(1));
    expect(lessonReducer(state, { type: "CHECK", answerId: "x" })).toBe(state);
  });

  it("CHECK locks the exercise and records the pending submission", () => {
    const state = run(
      start(exercises(2)),
      { type: "DRAFT", answer: { option_id: 12 } },
      { type: "CHECK", answerId: "a1" },
    );
    expect(state.phase).toBe("checking");
    expect(state.pending).toEqual({
      answerId: "a1",
      exerciseId: 1,
      answer: { option_id: 12 },
      kind: "check",
    });
    expect(isInteractive(state)).toBe(false);
    expect(canSkip(state)).toBe(false);
  });

  it("ignores a second CHECK and edits while the answer is being graded", () => {
    const checking = run(
      start(exercises(2)),
      { type: "DRAFT", answer: { option_id: 12 } },
      { type: "CHECK", answerId: "a1" },
    );
    expect(lessonReducer(checking, { type: "CHECK", answerId: "a2" })).toBe(checking);
    expect(lessonReducer(checking, { type: "DRAFT", answer: { option_id: 13 } })).toBe(checking);
    expect(lessonReducer(checking, { type: "SKIP", answerId: "a3" })).toBe(checking);
  });

  it("ignores drafts for match pairs and speaking exercises", () => {
    const match = start([makeExercise(1, "match_pairs")]);
    expect(lessonReducer(match, { type: "DRAFT", answer: { option_id: 1 } })).toBe(match);
    const speak = start([makeExercise(1, "speak")]);
    expect(lessonReducer(speak, { type: "DRAFT", answer: { text: "hola" } })).toBe(speak);
  });

  it("ignores results for answers that are not pending", () => {
    const checking = run(
      start(exercises(1)),
      { type: "DRAFT", answer: { option_id: 12 } },
      { type: "CHECK", answerId: "a1" },
    );
    const stale = lessonReducer(checking, { type: "RESULT", answerId: "old", result: CORRECT });
    expect(stale).toBe(checking);
  });

  it("returns to answering with the draft intact when submitting fails", () => {
    const checking = run(
      start(exercises(1)),
      { type: "DRAFT", answer: { option_id: 12 } },
      { type: "CHECK", answerId: "a1" },
    );
    const failed = lessonReducer(checking, { type: "SUBMIT_FAILED", answerId: "a1" });
    expect(failed.phase).toBe("answering");
    expect(failed.pending).toBeNull();
    expect(failed.draft).toEqual({ option_id: 12 });
    expect(lessonReducer(checking, { type: "SUBMIT_FAILED", answerId: "zzz" })).toBe(checking);
  });
});

describe("results and the queue", () => {
  it("a correct answer shows feedback, marks the exercise done and moves the progress bar", () => {
    const state = check(start(exercises(4)), CORRECT, 0.42);
    expect(state.phase).toBe("feedback");
    expect(state.feedback).toEqual({ result: CORRECT, kind: "check", roll: 0.42 });
    expect(state.doneIds).toEqual([1]);
    expect(lessonProgress(state)).toBe(0.25);
    expect(state.combo).toBe(1);
    expect(state.answeredCount).toBe(1);
    expect(currentExercise(state)?.id).toBe(1);
  });

  it("a typo still counts as correct", () => {
    const state = check(start(exercises(2)), makeResult({ outcome: "typo" }));
    expect(state.doneIds).toEqual([1]);
    expect(state.combo).toBe(1);
  });

  it("CONTINUE moves to the next exercise with a clean slate", () => {
    const state = cont(check(start(exercises(2)), CORRECT));
    expect(state.phase).toBe("answering");
    expect(currentExercise(state)?.id).toBe(2);
    expect(state.draft).toBeNull();
    expect(state.feedback).toBeNull();
    expect(state.queue).toHaveLength(1);
  });

  it("re-asks a missed exercise at the end with the previous-mistake flag", () => {
    const state = check(start(exercises(3)), wrong(4));
    expect(state.phase).toBe("feedback");
    expect(state.doneIds).toEqual([]);
    expect(state.queue.map((item) => item.exerciseId)).toEqual([1, 2, 3, 1]);
    expect(state.queue[3].previousMistake).toBe(true);
    expect(state.queue[3].key).not.toBe(state.queue[0].key);
    expect(state.hearts).toBe(4);
    expect(state.heartLosses).toBe(1);
    expect(lessonProgress(state)).toBe(0);
  });

  it("keeps re-asking until the exercise is answered correctly, then completes", () => {
    let state = start(exercises(2));
    state = cont(check(state, wrong(4))); // ex 1 wrong
    state = cont(check(state, CORRECT)); // ex 2 right
    expect(state.phase).toBe("interstitial"); // review your mistakes
    state = cont(state);
    expect(currentItem(state)).toMatchObject({ exerciseId: 1, previousMistake: true });
    state = cont(check(state, wrong(3))); // ex 1 wrong again
    expect(currentItem(state)).toMatchObject({ exerciseId: 1, previousMistake: true });
    expect(state.phase).toBe("answering"); // review already shown once
    state = check(state, CORRECT);
    expect(lessonProgress(state)).toBe(1);
    state = cont(state);
    expect(state.phase).toBe("completing");
    expect(state.queue).toHaveLength(0);
  });

  it("only completes once every planned exercise is done", () => {
    let state = start(exercises(3));
    state = passCurrent(state);
    state = passCurrent(state);
    expect(state.phase).toBe("answering");
    state = passCurrent(state);
    expect(state.phase).toBe("completing");
    expect(state.doneIds).toEqual([1, 2, 3]);
  });

  it("SKIP costs no heart, shows the solution and re-queues the exercise", () => {
    const state = skip(start(exercises(2)), SKIPPED);
    expect(state.phase).toBe("feedback");
    expect(state.feedback?.kind).toBe("skip");
    expect(state.hearts).toBe(5);
    expect(state.heartLosses).toBe(0);
    expect(state.queue.at(-1)).toMatchObject({ exerciseId: 1, previousMistake: true });
  });

  it("SKIP submits a skipped answer", () => {
    const state = lessonReducer(start(exercises(1)), { type: "SKIP", answerId: "s1" });
    expect(state.phase).toBe("checking");
    expect(state.pending).toMatchObject({ answer: { skipped: true }, kind: "skip" });
  });

  it("can't-speak-now finishes a speaking exercise without a feedback bar or combo loss", () => {
    let state = start([makeExercise(1), makeExercise(2, "speak"), makeExercise(3)]);
    state = cont(check(state, CORRECT));
    state = skip(state, makeResult({ outcome: "skipped", correct: false }), true);
    expect(state.phase).toBe("answering");
    expect(currentExercise(state)?.id).toBe(3);
    expect(state.doneIds).toEqual([1, 2]);
    expect(state.combo).toBe(1);
  });

  it("can't-listen-now re-queues without the mistake flag when the server still needs it", () => {
    let state = start([makeExercise(1, "listen_type"), makeExercise(2)]);
    state = skip(state, SKIPPED, true);
    expect(state.phase).toBe("answering");
    expect(currentExercise(state)?.id).toBe(2);
    expect(state.queue.at(-1)).toMatchObject({ exerciseId: 1, previousMistake: false });
  });
});

describe("combo", () => {
  it("shows N IN A ROW from two correct answers", () => {
    let state = start(exercises(4));
    state = cont(check(state, CORRECT));
    expect(comboLabel(state)).toBeNull();
    state = check(state, CORRECT);
    expect(comboLabel(state)).toBe(2);
  });

  it("resets on a wrong answer and on a skip, and remembers the best run", () => {
    let state = start(exercises(6), "lesson", false);
    state = cont(check(state, CORRECT));
    state = cont(check(state, CORRECT));
    state = cont(check(state, CORRECT));
    expect(state.combo).toBe(3);
    state = cont(check(state, wrong(4)));
    expect(state.combo).toBe(0);
    expect(comboLabel(state)).toBeNull();
    state = cont(check(state, CORRECT));
    state = skip(state, SKIPPED);
    expect(state.combo).toBe(0);
    expect(state.bestCombo).toBe(3);
  });
});

describe("interstitials", () => {
  it("shows a motivation message after the 4th exercise, once", () => {
    let state = start(exercises(8));
    for (let i = 0; i < 3; i += 1) {
      state = cont(check(state, wrong(5 - i - 1)));
      expect(state.phase).toBe("answering");
    }
    state = cont(check(state, CORRECT), 0.7);
    expect(state.phase).toBe("interstitial");
    expect(state.interstitial).toEqual({ kind: "motivation", combo: 1, roll: 0.7 });
    state = cont(state);
    expect(state.phase).toBe("answering");
    expect(currentExercise(state)?.id).toBe(5);
    state = cont(check(state, CORRECT));
    expect(state.phase).toBe("answering");
  });

  it("celebrates combos of 5 and 10", () => {
    let state = start(exercises(12));
    const seen: string[] = [];
    for (let i = 0; i < 11; i += 1) {
      state = cont(check(state, CORRECT));
      if (state.phase === "interstitial" && state.interstitial) {
        seen.push(`${state.interstitial.kind}@${i + 1}:${state.interstitial.combo}`);
        state = cont(state);
      }
    }
    expect(seen).toEqual(["motivation@4:4", "combo@5:5", "combo@10:10"]);
  });

  it("introduces the first re-asked mistake once, ahead of other messages", () => {
    let state = start(exercises(4));
    state = cont(check(state, wrong(4)));
    state = cont(check(state, CORRECT));
    state = cont(check(state, CORRECT));
    // The 4th answer makes motivation due, but the re-ask comes next, so review wins.
    state = cont(check(state, CORRECT));
    expect(state.interstitial?.kind).toBe("review");
    expect(state.reviewShown).toBe(true);
    expect(state.motivationShown).toBe(false);
    state = cont(state);
    expect(currentItem(state)?.previousMistake).toBe(true);
    // A second miss on the re-ask leads to another re-ask without a second review screen.
    state = cont(check(state, wrong(3)));
    expect(state.interstitial?.kind).not.toBe("review");
  });

  it("shows nothing when motivational messages are off", () => {
    let state = start(exercises(7), "lesson", false);
    state = cont(check(state, wrong(4)));
    for (let i = 0; i < 6; i += 1) {
      state = cont(check(state, CORRECT));
      expect(state.phase).not.toBe("interstitial");
    }
  });

  it("follows a settings change made after the lesson started", () => {
    let state = start(exercises(6));
    state = lessonReducer(state, { type: "SET_MOTIVATIONAL", enabled: false });
    for (let i = 0; i < 5; i += 1) {
      state = cont(check(state, CORRECT));
      expect(state.phase).not.toBe("interstitial");
    }
    expect(lessonReducer(state, { type: "SET_MOTIVATIONAL", enabled: false })).toBe(state);
  });

  it("never interrupts the end of the lesson", () => {
    let state = start(exercises(4));
    for (let i = 0; i < 3; i += 1) state = passCurrent(state);
    state = cont(check(state, CORRECT));
    expect(state.phase).toBe("completing");
  });
});

describe("hearts", () => {
  it("follows the server's heart count and pulses only on a loss", () => {
    let state = check(start(exercises(3)), wrong(4));
    expect(state.heartLosses).toBe(1);
    state = cont(state);
    state = check(state, makeResult({ hearts: 4 }));
    expect(state.heartLosses).toBe(1);
  });

  it("opens the out-of-hearts modal after the feedback bar and resumes after a refill", () => {
    let state = start(exercises(3), "lesson", false);
    state = check(state, wrong(0));
    expect(state.phase).toBe("feedback");
    expect(state.modal).toBeNull();
    state = cont(state);
    expect(state.modal).toBe("outOfHearts");
    expect(state.phase).toBe("feedback");
    expect(cont(state)).toBe(state); // input blocked behind the modal

    state = lessonReducer(state, { type: "REFILLED", hearts: 5 });
    expect(state.modal).toBeNull();
    expect(state.hearts).toBe(5);
    expect(state.phase).toBe("answering");
    expect(currentExercise(state)?.id).toBe(2);
  });

  it("offers practice or leaving when out of hearts", () => {
    const state = cont(check(start(exercises(2)), wrong(0)));
    expect(lessonReducer(state, { type: "PRACTICE" })).toMatchObject({
      phase: "done",
      exit: "practice",
    });
    expect(lessonReducer(state, { type: "NO_THANKS" })).toMatchObject({
      phase: "done",
      exit: "no-thanks",
    });
  });

  it("ignores refill, practice and no-thanks without the modal", () => {
    const state = start(exercises(2));
    expect(lessonReducer(state, { type: "REFILLED", hearts: 5 })).toBe(state);
    expect(lessonReducer(state, { type: "PRACTICE" })).toBe(state);
    expect(lessonReducer(state, { type: "NO_THANKS" })).toBe(state);
  });
});

describe("quit modal", () => {
  it("opens, closes and confirms", () => {
    const state = lessonReducer(start(exercises(2)), { type: "QUIT_OPEN" });
    expect(state.modal).toBe("quit");
    expect(isInteractive(state)).toBe(false);
    expect(lessonReducer(state, { type: "QUIT_CLOSE" }).modal).toBeNull();
    expect(lessonReducer(state, { type: "QUIT_CONFIRM" })).toMatchObject({
      phase: "done",
      exit: "quit",
      modal: null,
    });
  });

  it("blocks CHECK while open", () => {
    const state = run(
      start(exercises(2)),
      { type: "DRAFT", answer: { option_id: 1 } },
      { type: "QUIT_OPEN" },
    );
    expect(lessonReducer(state, { type: "CHECK", answerId: "a" })).toBe(state);
  });

  it("still applies a result that lands while the modal is open", () => {
    const answerId = nextId();
    const state = run(
      start(exercises(2)),
      { type: "DRAFT", answer: { option_id: 1 } },
      { type: "CHECK", answerId },
      { type: "QUIT_OPEN" },
      { type: "RESULT", answerId, result: CORRECT },
    );
    expect(state.phase).toBe("feedback");
    expect(state.modal).toBe("quit");
  });

  it("is not available once the lesson is over", () => {
    let state = start(exercises(1));
    state = cont(check(state, CORRECT));
    state = lessonReducer(state, { type: "COMPLETED", result: makeCompletion() });
    expect(lessonReducer(state, { type: "QUIT_OPEN" })).toBe(state);
    expect(lessonReducer(state, { type: "QUIT_CONFIRM" })).toBe(state);
  });
});

describe("match pairs", () => {
  const board = () => start([makeExercise(1, "match_pairs"), makeExercise(2)]);

  it("submits a pair once one tile from each column is selected", () => {
    let state = lessonReducer(board(), {
      type: "MATCH_SELECT",
      side: "right",
      tileId: 202,
      answerId: "unused",
    });
    expect(state.match.right).toBe(202);
    expect(state.pending).toBeNull();
    state = lessonReducer(state, {
      type: "MATCH_SELECT",
      side: "left",
      tileId: 101,
      answerId: "p1",
    });
    expect(state.pending).toEqual({
      answerId: "p1",
      exerciseId: 1,
      answer: { pair: [101, 202] },
      kind: "match",
    });
    expect(state.phase).toBe("answering");
    expect(isInteractive(state)).toBe(false);
  });

  it("deselects a tile tapped twice and ignores foreign or matched tiles", () => {
    let state = lessonReducer(board(), {
      type: "MATCH_SELECT",
      side: "left",
      tileId: 101,
      answerId: "x",
    });
    state = lessonReducer(state, {
      type: "MATCH_SELECT",
      side: "left",
      tileId: 101,
      answerId: "x",
    });
    expect(state.match.left).toBeNull();
    const foreign = lessonReducer(state, {
      type: "MATCH_SELECT",
      side: "left",
      tileId: 201,
      answerId: "x",
    });
    expect(foreign).toBe(state);

    state = selectPair(state, 101, 202, makeResult({ pair_matched: true, exercise_done: false }));
    expect(state.match.matched).toEqual([101, 202]);
    expect(
      lessonReducer(state, { type: "MATCH_SELECT", side: "left", tileId: 101, answerId: "x" }),
    ).toBe(state);
  });

  it("keeps the board open after a correct pair", () => {
    const state = selectPair(
      board(),
      101,
      202,
      makeResult({ pair_matched: true, exercise_done: false }),
    );
    expect(state.phase).toBe("answering");
    expect(state.match).toMatchObject({
      left: null,
      right: null,
      matched: [101, 202],
      wrong: null,
    });
    expect(state.doneIds).toEqual([]);
  });

  it("flashes a wrong pair, costs a heart and breaks the combo", () => {
    let state = cont(check(start([makeExercise(1), makeExercise(2, "match_pairs")]), CORRECT));
    expect(state.combo).toBe(1);
    state = selectPair(state, 101, 201, wrong(4, { pair_matched: false }));
    expect(state.match.wrong).toEqual([101, 201]);
    expect(state.match.flashKey).toBe(1);
    expect(state.match.left).toBeNull();
    expect(state.hearts).toBe(4);
    expect(state.heartLosses).toBe(1);
    expect(state.combo).toBe(0);
    expect(state.phase).toBe("answering");

    expect(lessonReducer(state, { type: "MATCH_FLASH_END", flashKey: 0 })).toBe(state);
    expect(lessonReducer(state, { type: "MATCH_FLASH_END", flashKey: 1 }).match.wrong).toBeNull();
  });

  it("finishes with the green feedback bar after the last pair", () => {
    let state = selectPair(
      board(),
      101,
      202,
      makeResult({ pair_matched: true, exercise_done: false }),
    );
    state = selectPair(state, 102, 201, makeResult({ pair_matched: true, exercise_done: true }));
    expect(state.phase).toBe("feedback");
    expect(state.feedback?.kind).toBe("match");
    expect(state.doneIds).toEqual([1]);
    expect(state.combo).toBe(1);
    expect(state.answeredCount).toBe(1);
    state = cont(state);
    expect(currentExercise(state)?.id).toBe(2);
    expect(state.match.matched).toEqual([]);
  });

  it("opens the out-of-hearts modal mid-board and returns to the same board after a refill", () => {
    let state = selectPair(board(), 101, 201, wrong(0, { pair_matched: false }));
    expect(state.modal).toBe("outOfHearts");
    expect(state.resumeAfterRefill).toBe("stay");
    state = lessonReducer(state, { type: "REFILLED", hearts: 5 });
    expect(state.modal).toBeNull();
    expect(state.phase).toBe("answering");
    expect(currentExercise(state)?.id).toBe(1);
  });

  it("ignores taps while a pair is being checked and clears the selection if it fails", () => {
    let state = run(
      board(),
      { type: "MATCH_SELECT", side: "left", tileId: 101, answerId: "x" },
      { type: "MATCH_SELECT", side: "right", tileId: 202, answerId: "p1" },
    );
    expect(
      lessonReducer(state, { type: "MATCH_SELECT", side: "left", tileId: 102, answerId: "p2" }),
    ).toBe(state);
    state = lessonReducer(state, { type: "SUBMIT_FAILED", answerId: "p1" });
    expect(state.pending).toBeNull();
    expect(state.match).toMatchObject({ left: null, right: null });
    expect(state.phase).toBe("answering");
  });

  it("can be skipped, which re-queues the whole board", () => {
    const state = skip(board(), SKIPPED);
    expect(state.phase).toBe("feedback");
    expect(state.queue.at(-1)).toMatchObject({ exerciseId: 1, previousMistake: true });
  });

  it("only accepts a pair result for a pending pair, and an answer result for a pending answer", () => {
    const pairPending = run(
      board(),
      { type: "MATCH_SELECT", side: "left", tileId: 101, answerId: "x" },
      { type: "MATCH_SELECT", side: "right", tileId: 202, answerId: "p1" },
    );
    expect(lessonReducer(pairPending, { type: "RESULT", answerId: "p1", result: CORRECT })).toBe(
      pairPending,
    );
    const checking = run(
      start(exercises(1)),
      { type: "DRAFT", answer: { option_id: 1 } },
      { type: "CHECK", answerId: "c1" },
    );
    expect(lessonReducer(checking, { type: "MATCH_RESULT", answerId: "c1", result: CORRECT })).toBe(
      checking,
    );
  });

  it("ignores taps on other exercise types", () => {
    const state = start(exercises(1));
    expect(
      lessonReducer(state, { type: "MATCH_SELECT", side: "left", tileId: 101, answerId: "x" }),
    ).toBe(state);
  });
});

describe("legendary", () => {
  it("tracks the mistake budget from the server", () => {
    let state = start(exercises(3), "legendary", false);
    expect(state.mistakesLeft).toBe(3);
    state = check(state, wrong(5, { mistakes_left: 2, out_of_hearts: false }));
    expect(state.mistakesLeft).toBe(2);
    expect(state.hearts).toBe(5);
    expect(state.heartLosses).toBe(0);
  });

  it("fails after the feedback bar once the budget is exceeded", () => {
    let state = start(exercises(3), "legendary", false);
    state = check(state, wrong(5, { mistakes_left: -1, out_of_hearts: false }));
    expect(state.phase).toBe("feedback");
    state = cont(state);
    expect(state.phase).toBe("failed");
    expect(state.modal).toBeNull();
    expect(cont(state)).toMatchObject({ phase: "done", exit: "failed" });
  });

  it("fails immediately on a fatal wrong pair", () => {
    const state = selectPair(
      start([makeExercise(1, "match_pairs")], "legendary"),
      101,
      201,
      wrong(5, { pair_matched: false, out_of_hearts: true, mistakes_left: 0 }),
    );
    expect(state.phase).toBe("failed");
  });

  it("isFatal covers hearts and the legendary budget", () => {
    expect(isFatal("lesson", wrong(0))).toBe(true);
    expect(isFatal("lesson", wrong(2))).toBe(false);
    expect(isFatal("lesson", wrong(2, { mistakes_left: -1 }))).toBe(false);
    expect(isFatal("legendary", wrong(5, { mistakes_left: 0 }))).toBe(false);
    expect(isFatal("legendary", wrong(5, { mistakes_left: -1 }))).toBe(true);
  });
});

describe("timed practice", () => {
  it("starts the clock from the rules and adds a bonus for each correct answer", () => {
    let state = start(exercises(5), "timed", false);
    expect(state.timeLeftMs).toBe(30_000);
    state = lessonReducer(state, { type: "TICK", ms: 1_000 });
    expect(state.timeLeftMs).toBe(29_000);
    state = check(state, CORRECT);
    expect(state.timeLeftMs).toBe(36_000);
    state = cont(check(cont(state), wrong(5)));
    expect(state.timeLeftMs).toBe(36_000);
  });

  it("pauses during feedback, interstitials and modals", () => {
    let state = check(start(exercises(3), "timed"), CORRECT);
    expect(lessonReducer(state, { type: "TICK", ms: 500 })).toBe(state);
    state = lessonReducer(cont(state), { type: "QUIT_OPEN" });
    expect(lessonReducer(state, { type: "TICK", ms: 500 })).toBe(state);
  });

  it("completes the session when time runs out, even mid-check", () => {
    const checking = run(
      start(exercises(3), "timed"),
      { type: "DRAFT", answer: { option_id: 1 } },
      { type: "CHECK", answerId: "t1" },
    );
    const out = lessonReducer(checking, { type: "TICK", ms: 31_000 });
    expect(out).toMatchObject({ phase: "completing", timeLeftMs: 0, pending: null });
    expect(lessonReducer(out, { type: "RESULT", answerId: "t1", result: CORRECT })).toBe(out);
  });

  it("does nothing for untimed sessions", () => {
    const state = start(exercises(2));
    expect(lessonReducer(state, { type: "TICK", ms: 1_000 })).toBe(state);
  });
});

describe("completion and celebration", () => {
  const finished = () => cont(check(start(exercises(1)), CORRECT));

  it("orders the celebration screens", () => {
    expect(buildCelebrateSteps(makeCompletion())).toEqual([{ kind: "complete" }]);
    const full = makeCompletion({
      streak: { extended: true, previous: 12, current: 13, milestone: false, week: [] },
      daily_goal: { goal_xp: 20, today_xp: 23, reached_now: true, chest_gems: 5 },
      achievements: [
        {
          key: "wildfire",
          name: "Wildfire",
          level: 3,
          gems: 25,
          description: "Reach a 14 day streak",
        },
        { key: "sage", name: "Sage", level: 5, gems: 25, description: "Earn 2000 XP" },
      ],
    });
    expect(buildCelebrateSteps(full)).toEqual([
      { kind: "complete" },
      { kind: "streak" },
      { kind: "goal" },
      { kind: "chest" },
      { kind: "achievement", index: 0 },
      { kind: "achievement", index: 1 },
    ]);
  });

  it("walks through every screen and then finishes", () => {
    let state = lessonReducer(finished(), {
      type: "COMPLETED",
      result: makeCompletion({
        streak: { extended: true, previous: 1, current: 2, milestone: false, week: [] },
      }),
    });
    expect(state.phase).toBe("celebrate");
    expect(state.steps[state.stepIndex]).toEqual({ kind: "complete" });
    state = cont(state);
    expect(state.steps[state.stepIndex]).toEqual({ kind: "streak" });
    state = cont(state);
    expect(state).toMatchObject({ phase: "done", exit: "complete" });
  });

  it("surfaces a completion error and retries", () => {
    let state = lessonReducer(finished(), {
      type: "COMPLETE_FAILED",
      error: { code: "network", status: 0, message: "offline" },
    });
    expect(state.phase).toBe("completing");
    expect(state.error?.code).toBe("network");
    const attempt = state.attempt;
    state = lessonReducer(state, { type: "RETRY" });
    expect(state.error).toBeNull();
    expect(state.attempt).toBe(attempt + 1);
  });

  it("ignores completion events in other phases", () => {
    const state = start(exercises(1));
    expect(lessonReducer(state, { type: "COMPLETED", result: makeCompletion() })).toBe(state);
    expect(
      lessonReducer(state, {
        type: "COMPLETE_FAILED",
        error: { code: "x", status: 500, message: "x" },
      }),
    ).toBe(state);
  });

  it("ignores CONTINUE where there is nothing to continue", () => {
    const state = start(exercises(1));
    expect(cont(state)).toBe(state);
  });
});
