"use client";

import type { ReactNode } from "react";

import { cx } from "../cx";
import { NumberBadge } from "./parts";

interface ChoiceRowProps {
  index: number;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
  children: ReactNode;
}

/** A full-width text choice (600x60) with its keyboard number on the left. */
export function ChoiceRow({ index, selected, locked, onSelect, children }: ChoiceRowProps) {
  return (
    <button
      type="button"
      data-lesson-option=""
      aria-pressed={selected}
      aria-disabled={locked}
      onClick={locked ? undefined : onSelect}
      className={cx(
        "flex min-h-[60px] w-full items-center gap-4 rounded-tile border-2 px-4 py-[11px] text-left text-lead font-medium transition-[background-color,border-color,translate,box-shadow] duration-100",
        selected
          ? "border-selected-border bg-selected-bg text-selected-text shadow-edge-selected"
          : "border-border bg-surface text-body shadow-edge-border",
        locked ? "cursor-default" : "cursor-pointer active:translate-y-[2px] active:shadow-none",
        !locked && !selected && "hover:bg-surface-hover",
      )}
    >
      <NumberBadge index={index} selected={selected} />
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
