"use client";

import type { ReactNode } from "react";

import { cx } from "../cx";
import { CHOICE_TONE_CLASSES, NumberBadge, type ChoiceTone } from "./parts";

interface ChoiceRowProps {
  index: number;
  tone: ChoiceTone;
  locked: boolean;
  onSelect: () => void;
  children: ReactNode;
}

/** A full-width text choice (600x60) with its keyboard number on the left. */
export function ChoiceRow({ index, tone, locked, onSelect, children }: ChoiceRowProps) {
  return (
    <button
      type="button"
      data-lesson-option=""
      aria-pressed={tone !== "idle"}
      aria-disabled={locked}
      onClick={locked ? undefined : onSelect}
      className={cx(
        "flex min-h-[60px] w-full items-center gap-4 rounded-tile border-2 px-4 py-[11px] text-left text-lead font-medium transition-[background-color,border-color,color,translate,box-shadow] duration-100 shorter:min-h-[52px] shorter:py-2",
        CHOICE_TONE_CLASSES[tone],
        locked ? "cursor-default" : "cursor-pointer active:translate-y-[2px] active:shadow-none",
        !locked && tone === "idle" && "hover:bg-surface-hover",
      )}
    >
      <NumberBadge index={index} tone={tone} />
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
