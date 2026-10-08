import { describe, expect, it } from "vitest";

import {
  buildQueue,
  isAnswerReady,
  isCorrectOutcome,
  pickVariant,
  progressFraction,
  requeue,
  scheduleInterstitial,
  type ScheduleInput,
} from "./queue";
import { makeExercise } from "./test-fixtures";

const base: ScheduleInput = {
  enabled: true,
  next: { key: "2:0", exerciseId: 2, previousMistake: false },
  combo: 1,
  lastCorrect: true,
  answeredCount: 1,
  reviewShown: false,
  motivationShown: false,
  roll: 0.5,
};

describe("queue helpers", () => {
  it("builds one fresh slot per planned exercise", () => {
    expect(buildQueue([makeExercise(4), makeExercise(9)])).toEqual([
      { key: "4:0", exerciseId: 4, previousMistake: false },
      { key: "9:0", exerciseId: 9, previousMistake: false },
    ]);
  });

  it("appends re-asks without touching the original queue", () => {
    const queue = buildQueue([makeExercise(1)]);
    const next = requeue(queue, 1, 3, true);
    expect(queue).toHaveLength(1);
    expect(next.at(-1)).toEqual({ key: "1:3", exerciseId: 1, previousMistake: true });
  });

  it("knows when a draft can be checked", () => {
    expect(isAnswerReady(null)).toBe(false);
    expect(isAnswerReady({ option_id: 3 })).toBe(true);
    expect(isAnswerReady({ tile_ids: [] })).toBe(false);
    expect(isAnswerReady({ tile_ids: [1] })).toBe(true);
    expect(isAnswerReady({ text: "" })).toBe(false);
    expect(isAnswerReady({ text: "\n " })).toBe(false);
    expect(isAnswerReady({ text: "hola" })).toBe(true);
    expect(isAnswerReady({ pair: [1, 2] })).toBe(true);
    expect(isAnswerReady({ skipped: true })).toBe(true);
  });

  it("counts typos as correct", () => {
    expect(isCorrectOutcome({ outcome: "correct" })).toBe(true);
    expect(isCorrectOutcome({ outcome: "typo" })).toBe(true);
    expect(isCorrectOutcome({ outcome: "incorrect" })).toBe(false);
    expect(isCorrectOutcome({ outcome: "skipped" })).toBe(false);
  });

  it("clamps progress to 0..1", () => {
    expect(progressFraction(0, 0)).toBe(0);
    expect(progressFraction(3, 12)).toBe(0.25);
    expect(progressFraction(14, 12)).toBe(1);
  });

  it("picks variants from a roll, including the edges", () => {
    const list = ["a", "b", "c"];
    expect(pickVariant(list, 0)).toBe("a");
    expect(pickVariant(list, 0.5)).toBe("b");
    expect(pickVariant(list, 0.99)).toBe("c");
    expect(pickVariant(list, 1)).toBe("c");
    expect(pickVariant(list, -1)).toBe("a");
  });
});

describe("scheduleInterstitial", () => {
  it("shows nothing by default", () => {
    expect(scheduleInterstitial(base)).toBeNull();
  });

  it("respects the motivational messages setting", () => {
    expect(
      scheduleInterstitial({ ...base, enabled: false, combo: 5, answeredCount: 4 }),
    ).toBeNull();
  });

  it("never shows one at the end of the queue", () => {
    expect(scheduleInterstitial({ ...base, next: undefined, combo: 5 })).toBeNull();
  });

  it("introduces the first re-ask once", () => {
    const next = { key: "1:5", exerciseId: 1, previousMistake: true };
    expect(scheduleInterstitial({ ...base, next })?.kind).toBe("review");
    expect(scheduleInterstitial({ ...base, next, reviewShown: true })).toBeNull();
  });

  it("celebrates combos of 5 and 10 only right after a correct answer", () => {
    expect(scheduleInterstitial({ ...base, combo: 5 })).toEqual({
      kind: "combo",
      combo: 5,
      roll: 0.5,
    });
    expect(scheduleInterstitial({ ...base, combo: 10 })?.kind).toBe("combo");
    expect(scheduleInterstitial({ ...base, combo: 6 })).toBeNull();
    expect(scheduleInterstitial({ ...base, combo: 5, lastCorrect: false })).toBeNull();
  });

  it("motivates once after four answers", () => {
    expect(scheduleInterstitial({ ...base, answeredCount: 3 })).toBeNull();
    expect(scheduleInterstitial({ ...base, answeredCount: 4 })?.kind).toBe("motivation");
    expect(scheduleInterstitial({ ...base, answeredCount: 6 })?.kind).toBe("motivation");
    expect(scheduleInterstitial({ ...base, answeredCount: 6, motivationShown: true })).toBeNull();
  });

  it("prioritises review over combo over motivation", () => {
    const next = { key: "1:5", exerciseId: 1, previousMistake: true };
    expect(scheduleInterstitial({ ...base, next, combo: 5, answeredCount: 5 })?.kind).toBe(
      "review",
    );
    expect(scheduleInterstitial({ ...base, combo: 5, answeredCount: 5 })?.kind).toBe("combo");
  });
});
