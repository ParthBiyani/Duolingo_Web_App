import { Crown } from "@/components/icons";

/** Deep gold for the digit so it reads on the gold crown in both themes (no token exists). */
const CROWN_DIGIT_COLOR = "#9A5B00";

/** Crown with the skill's crown level, pinned to the bottom-right of a completed node. */
export function CrownBadge({ level }: { level: 1 | 2 }) {
  return (
    <span
      aria-hidden="true"
      data-testid="crown-badge"
      className="pointer-events-none absolute -right-3 -bottom-2 z-[2] grid place-items-center"
    >
      <Crown size={32} />
      <span
        className="absolute inset-x-0 top-[10px] text-center text-[12px] leading-none font-extrabold"
        style={{ color: CROWN_DIGIT_COLOR }}
      >
        {level}
      </span>
    </span>
  );
}
