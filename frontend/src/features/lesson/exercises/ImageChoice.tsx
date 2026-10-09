"use client";

import { cx } from "../cx";
import { useNumberKeys } from "../keyboard";
import { CHOICE_TONE_CLASSES, NumberBadge, choiceTone } from "./parts";
import type { ExerciseProps } from "./types";

/** "Which one of these is ...?": picture cards (195x253 on desktop) with a label each. */
export function ImageChoice({ exercise, draft, onDraft, locked, result }: ExerciseProps) {
  const selected = draft !== null && "option_id" in draft ? draft.option_id : null;
  const { options } = exercise;

  useNumberKeys(options.length, !locked, (index) => onDraft({ option_id: options[index].id }));

  return (
    <div
      role="group"
      aria-label={exercise.prompt}
      className={cx(
        "grid gap-2",
        options.length === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3",
      )}
    >
      {options.map((option, index) => {
        const tone = choiceTone(selected === option.id, result);
        return (
          <button
            key={option.id}
            type="button"
            data-lesson-option=""
            aria-pressed={tone !== "idle"}
            aria-disabled={locked}
            onClick={locked ? undefined : () => onDraft({ option_id: option.id })}
            className={cx(
              "flex min-h-[170px] flex-col rounded-tile border-2 p-3 transition-[background-color,border-color,color,translate,box-shadow] duration-100 md:h-[253px] md:shorter:h-[220px]",
              CHOICE_TONE_CLASSES[tone],
              locked
                ? "cursor-default"
                : "cursor-pointer active:translate-y-[2px] active:shadow-none",
              !locked && tone === "idle" && "hover:bg-surface-hover",
            )}
          >
            <span
              aria-hidden="true"
              className="flex flex-1 items-center justify-center text-[64px] leading-none select-none md:text-[96px]"
            >
              {option.image}
            </span>
            <span className="flex items-center justify-center gap-2 md:justify-between">
              <span className={cx("text-base font-medium", tone === "idle" && "text-title")}>
                {option.text}
              </span>
              <NumberBadge index={index} tone={tone} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
