"use client";

import { Clock, Close, Crown, Heart, HeartEmpty } from "@/components/icons";
import { ProgressBar } from "@/components/ui";
import type { SessionKind } from "@/lib/api";

import { formatDuration } from "./celebrate/stats";
import { cx } from "./cx";
import { lessonStrings } from "./strings";

/** Below this many seconds the timer turns red. */
const LOW_TIME_MS = 5_000;

interface TimerBarProps {
  timeLeftMs: number;
  totalMs: number;
}

/** Timed practice: a draining bar plus the seconds left (30 s to start, +7 s per correct). */
export function TimerBar({ timeLeftMs, totalMs }: TimerBarProps) {
  const low = timeLeftMs <= LOW_TIME_MS;
  const seconds = Math.ceil(timeLeftMs / 1000);
  return (
    <div className="flex flex-1 items-center gap-3 md:gap-4">
      <ProgressBar
        value={totalMs > 0 ? timeLeftMs / totalMs : 0}
        color={low ? "red" : "blue"}
        aria-label={lessonStrings.timeLeftLabel(seconds)}
        className="flex-1"
      />
      <span
        className={cx(
          "flex shrink-0 items-center gap-1.5 text-lead font-bold tabular-nums",
          low ? "text-red" : "text-blue",
        )}
        aria-hidden="true"
      >
        <Clock size={26} />
        {formatDuration(seconds)}
      </span>
    </div>
  );
}

interface LessonHeaderProps {
  kind: SessionKind;
  /** Fraction of distinct exercises finished. */
  progress: number;
  /** "N IN A ROW" count, or null to hide the label. */
  combo: number | null;
  hearts: number;
  /** Bumped on every heart lost; re-keys the icon so the pulse replays. */
  heartLosses: number;
  mistakesLeft: number | null;
  timeLeftMs: number | null;
  timerTotalMs: number;
  /** Hide hearts until the session has loaded. */
  ready: boolean;
  onQuit: () => void;
}

/** Grey X, the progress (or timer) bar with the combo label, and hearts / mistakes left. */
export function LessonHeader({
  kind,
  progress,
  combo,
  hearts,
  heartLosses,
  mistakesLeft,
  timeLeftMs,
  timerTotalMs,
  ready,
  onQuit,
}: LessonHeaderProps) {
  const timed = kind === "timed" && timeLeftMs !== null;

  return (
    <header className="mx-auto flex w-full max-w-[1080px] shrink-0 items-center gap-4 px-4 pt-6 md:gap-6 md:px-10 md:pt-[50px] short:pt-4 md:short:pt-6">
      <button
        type="button"
        onClick={onQuit}
        aria-label={lessonStrings.quitLabel}
        className="-m-1 grid shrink-0 cursor-pointer place-items-center rounded-lg p-1 text-disabled transition-colors hover:text-muted"
      >
        <Close size={32} />
      </button>

      {timed ? (
        <TimerBar timeLeftMs={timeLeftMs} totalMs={timerTotalMs} />
      ) : (
        <div className="relative flex-1">
          {combo !== null ? (
            <p
              key={combo}
              className="absolute bottom-full left-0 mb-1.5 animate-pop text-caps whitespace-nowrap text-orange uppercase"
            >
              {lessonStrings.combo(combo)}
            </p>
          ) : null}
          <ProgressBar value={progress} aria-label={lessonStrings.progressLabel} />
        </div>
      )}

      {!ready || timed ? null : kind === "legendary" && mistakesLeft !== null ? (
        <p className="flex shrink-0 items-center gap-2 text-lead font-bold text-gold">
          <Crown size={30} />
          <span aria-hidden="true">{Math.max(0, mistakesLeft)}</span>
          <span className="sr-only">{lessonStrings.mistakesLabel(Math.max(0, mistakesLeft))}</span>
        </p>
      ) : (
        <p className="flex shrink-0 items-center gap-2 text-lead font-bold text-red">
          <span
            key={heartLosses}
            className={cx("grid", heartLosses > 0 && "animate-heart-pulse")}
            aria-hidden="true"
          >
            {hearts > 0 ? <Heart size={30} /> : <HeartEmpty size={30} />}
          </span>
          <span aria-hidden="true" className={hearts > 0 ? undefined : "text-disabled"}>
            {hearts}
          </span>
          <span className="sr-only">{lessonStrings.heartsLabel(hearts)}</span>
        </p>
      )}
    </header>
  );
}
