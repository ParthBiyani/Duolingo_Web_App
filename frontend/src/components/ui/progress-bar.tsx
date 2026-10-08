import type { ReactNode } from "react";

import { cn } from "./cn";

export type ProgressColor = "green" | "blue" | "gold" | "orange" | "red" | "purple";

export interface ProgressBarProps {
  /** Fraction complete, 0..1; values outside the range are clamped. */
  value: number;
  color?: ProgressColor;
  /** Text centred over the bar, e.g. "12 / 20". */
  label?: ReactNode;
  /** Accessible name; required when there is no visible label nearby. */
  "aria-label"?: string;
  className?: string;
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** 16px rounded track with an animated fill and the lighter highlight stripe. */
export function ProgressBar({
  value,
  color = "green",
  label,
  "aria-label": ariaLabel,
  className,
}: ProgressBarProps) {
  const fraction = clampProgress(value);
  const percent = Math.round(fraction * 100);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("ui-progress", `ui-progress-${color}`, className)}
    >
      <div
        className="ui-progress-fill"
        // A visible sliver from the first step on, like the original bar.
        style={{ width: `${fraction * 100}%`, minWidth: fraction > 0 ? "1rem" : 0 }}
      />
      {label !== undefined ? (
        <span className="ui-progress-label" aria-hidden="true">
          {label}
        </span>
      ) : null}
    </div>
  );
}
