import type { ReactNode } from "react";

import { cx } from "./cx";
import { lessonStrings } from "./strings";

/** Circular arrow drawn for the "previous mistake" badge (decorative). */
function RedoGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M15.5 8.5A6 6 0 1 0 14 14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M16.6 3.6V8.6H11.6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Four-point sparkle drawn for the "new word" badge (decorative). */
function SparkleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M10 1.5C10.7 6.2 13.8 9.3 18.5 10C13.8 10.7 10.7 13.8 10 18.5C9.3 13.8 6.2 10.7 1.5 10C6.2 9.3 9.3 6.2 10 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** A 16px caps label after a round icon in the badge colour. */
function Badge({
  glyph,
  className,
  children,
}: {
  glyph: ReactNode;
  className: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cx(
        "flex items-center gap-2.5 text-[1rem] leading-4 font-bold tracking-[0.04em] uppercase",
        className,
      )}
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-current">
        <span className="grid text-surface">{glyph}</span>
      </span>
      {children}
    </p>
  );
}

/** PREVIOUS MISTAKE (orange) on re-asked items, otherwise NEW WORD (purple) when flagged. */
export function ExerciseBadge({
  previousMistake,
  newWord,
}: {
  previousMistake: boolean;
  newWord: boolean;
}) {
  if (previousMistake) {
    return (
      <Badge glyph={<RedoGlyph />} className="text-orange">
        {lessonStrings.previousMistake}
      </Badge>
    );
  }
  if (newWord) {
    return (
      <Badge glyph={<SparkleGlyph />} className="text-purple">
        {lessonStrings.newWord}
      </Badge>
    );
  }
  return null;
}
