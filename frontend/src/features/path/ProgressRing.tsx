interface ProgressRingProps {
  /** Share of the skill's lessons completed, 0..1. */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  strokeWidth?: number;
}

/**
 * Circular progress track drawn around the active node. The arc is a circle whose dash length is
 * `value` of its circumference; rotating the SVG by -90deg makes it start at 12 o'clock.
 */
export function ProgressRing({ value, size = 98, strokeWidth = 8 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value));
  const centre = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
      data-testid="progress-ring"
      data-progress={clamped.toFixed(2)}
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
    >
      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-border"
      />
      {clamped > 0 ? (
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          className="stroke-(--unit-face)"
        />
      ) : null}
    </svg>
  );
}
