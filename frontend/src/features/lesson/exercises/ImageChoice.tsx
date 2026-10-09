"use client";

import { cx } from "../cx";
import { useNumberKeys } from "../keyboard";
import { NumberBadge } from "./parts";
import type { ExerciseProps } from "./types";

/** "Which one of these is ...?": picture cards (195x254 on desktop) with a label each. */
export function ImageChoice({ exercise, draft, onDraft, locked }: ExerciseProps) {
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
        const isSelected = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            data-lesson-option=""
            aria-pressed={isSelected}
            aria-disabled={locked}
            onClick={locked ? undefined : () => onDraft({ option_id: option.id })}
            className={cx(
              "flex min-h-[170px] flex-col rounded-tile border-2 p-3 transition-[background-color,border-color,translate,box-shadow] duration-100 md:h-[254px] md:short:h-[196px]",
              isSelected
                ? "border-selected-border bg-selected-bg text-selected-text shadow-edge-selected"
                : "border-border bg-surface text-body shadow-edge-border",
              locked
                ? "cursor-default"
                : "cursor-pointer active:translate-y-[2px] active:shadow-none",
              !locked && !isSelected && "hover:bg-surface-hover",
            )}
          >
            <span
              aria-hidden="true"
              className="flex flex-1 items-center justify-center text-[64px] leading-none select-none md:text-[96px]"
            >
              {option.image}
            </span>
            <span className="flex items-center justify-center gap-2 md:justify-between">
              <span className="text-base leading-6 font-medium md:text-lead">{option.text}</span>
              <NumberBadge index={index} selected={isSelected} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
