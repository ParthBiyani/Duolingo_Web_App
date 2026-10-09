import { Lock, Shield } from "@/components/icons";
import type { LeaderboardResponse } from "@/lib/api/types";

import { leaderboardStrings } from "./strings";

/** How many league badges are shown around the current one. */
const WINDOW = 5;

type Tier = LeaderboardResponse["tiers"][number];

/** First index of a window of `size` badges centred on `currentIndex`, kept within the list. */
export function badgeWindowStart(tierCount: number, currentIndex: number, size = WINDOW): number {
  const centred = currentIndex - Math.floor(size / 2);
  return Math.max(0, Math.min(centred, tierCount - size));
}

/**
 * Row of league shields: leagues already passed in colour, the learner's league enlarged, and the
 * leagues still ahead greyed out with a lock.
 */
export function LeagueBadgeStrip({ tiers, current }: { tiers: Tier[]; current: number }) {
  // Tier numbers come from the API; position in the list is what the window needs.
  const start = badgeWindowStart(
    tiers.length,
    tiers.findIndex((tier) => tier.tier === current),
  );
  const visible = tiers.slice(start, start + WINDOW);

  return (
    <ul className="flex items-center justify-center gap-3 md:gap-5">
      {visible.map((tier) => {
        const state = tier.tier < current ? "past" : tier.tier === current ? "current" : "locked";
        return (
          <li
            key={tier.tier}
            aria-current={state === "current" ? "true" : undefined}
            className="grid place-items-center"
          >
            <span className="sr-only">{leaderboardStrings.tierBadge(tier.name, state)}</span>
            {state === "locked" ? (
              <LockedShield size={52} />
            ) : (
              <Shield color={tier.color} size={state === "current" ? 84 : 52} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Grey shield with a padlock, for leagues the learner has not reached. */
export function LockedShield({ size }: { size: number }) {
  return (
    <span className="relative grid place-items-center" aria-hidden="true">
      {/* A utility beats the artwork's presentation attributes, turning the whole shield grey. */}
      <Shield size={size} className="[&_path]:fill-locked-face [&_path]:stroke-locked-face" />
      <Lock size={Math.round(size * 0.4)} className="absolute top-[30%]" />
    </span>
  );
}
