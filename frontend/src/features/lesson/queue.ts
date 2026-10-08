import type { Answer, AnswerResult, Exercise } from "@/lib/api";

/**
 * One slot in the lesson queue. The server sends the plan once; the client re-asks
 * missed or skipped exercises by appending a fresh slot for the same exercise.
 */
export interface QueueItem {
  /** Unique per attempt ("<exerciseId>:<seq>") so each attempt renders and animates fresh. */
  key: string;
  exerciseId: number;
  /** True when this slot re-asks an exercise the learner missed or skipped earlier. */
  previousMistake: boolean;
}

export type InterstitialKind = "motivation" | "combo" | "review";

export interface Interstitial {
  kind: InterstitialKind;
  /** The streak being celebrated (combo interstitials only). */
  combo: number;
  /** 0..1 roll used to pick one of several message variants without impure renders. */
  roll: number;
}

/** Combo counts that earn a "N in a row" interstitial. */
export const COMBO_MILESTONES: readonly number[] = [5, 10];

/** The motivation interstitial follows this many answered exercises. */
export const MOTIVATION_AFTER = 4;

/** The "N IN A ROW" header label appears from this combo onwards. */
export const COMBO_LABEL_FROM = 2;

export function buildQueue(exercises: readonly Exercise[]): QueueItem[] {
  return exercises.map((exercise) => ({
    key: `${exercise.id}:0`,
    exerciseId: exercise.id,
    previousMistake: false,
  }));
}

/** Appends a re-ask of `exerciseId` to the end of the queue. */
export function requeue(
  queue: readonly QueueItem[],
  exerciseId: number,
  seq: number,
  previousMistake: boolean,
): QueueItem[] {
  return [...queue, { key: `${exerciseId}:${seq}`, exerciseId, previousMistake }];
}

/** True when the draft is complete enough to CHECK (empty tiles or blank text are not). */
export function isAnswerReady(answer: Answer | null): boolean {
  if (answer === null) return false;
  if ("option_id" in answer) return true;
  if ("tile_ids" in answer) return answer.tile_ids.length > 0;
  if ("text" in answer) return answer.text.trim().length > 0;
  return "pair" in answer || "skipped" in answer;
}

export function isCorrectOutcome(result: Pick<AnswerResult, "outcome">): boolean {
  return result.outcome === "correct" || result.outcome === "typo";
}

/** Fraction (0..1) of distinct planned exercises that are finished. */
export function progressFraction(doneCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(1, Math.max(0, doneCount / totalCount));
}

export interface ScheduleInput {
  /** The learner's "Motivational messages" setting. */
  enabled: boolean;
  /** The item about to be shown (undefined when the queue is finished). */
  next: QueueItem | undefined;
  /** Combo after the exercise that was just finished. */
  combo: number;
  /** Whether the exercise that was just finished was answered correctly. */
  lastCorrect: boolean;
  answeredCount: number;
  reviewShown: boolean;
  motivationShown: boolean;
  roll: number;
}

/**
 * Decides which interstitial (if any) sits between the finished exercise and the next one.
 * Priority: review your mistakes > combo milestone > one-off motivation. Never at the very end.
 */
export function scheduleInterstitial(input: ScheduleInput): Interstitial | null {
  const { enabled, next, combo, lastCorrect, answeredCount, roll } = input;
  if (!enabled || next === undefined) return null;
  if (next.previousMistake && !input.reviewShown) return { kind: "review", combo, roll };
  if (lastCorrect && COMBO_MILESTONES.includes(combo)) return { kind: "combo", combo, roll };
  if (answeredCount >= MOTIVATION_AFTER && !input.motivationShown) {
    return { kind: "motivation", combo, roll };
  }
  return null;
}

/** Picks one entry from a list using a 0..1 roll (clamped, so a roll of 1 stays in range). */
export function pickVariant<T>(variants: readonly T[], roll: number): T {
  const index = Math.min(variants.length - 1, Math.max(0, Math.floor(roll * variants.length)));
  return variants[index];
}
