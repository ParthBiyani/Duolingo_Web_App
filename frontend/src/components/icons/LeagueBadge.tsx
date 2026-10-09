import { DuoImage } from "./DuoImage";
import type { IconProps } from "./IconBase";

export interface LeagueBadgeProps extends IconProps {
  /** League tier, 0 (Bronze) to 9 (Diamond). */
  tier: number;
  /** A league not reached yet: the grey padlock badge. */
  locked?: boolean;
}

/** The badge of one league, as on the leaderboard's league strip. */
export function LeagueBadge({ tier, locked = false, ...props }: LeagueBadgeProps) {
  const clamped = Math.min(9, Math.max(0, Math.round(tier))) as
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  return <DuoImage name={locked ? "league-locked" : `league-${clamped}`} {...props} />;
}
