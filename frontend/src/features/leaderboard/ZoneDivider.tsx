import { ArrowLeft } from "@/components/icons";

import { leaderboardStrings } from "./strings";
import type { DividerZone } from "./zones";

/**
 * Line marking where the promotion or demotion zone starts. Hidden from assistive tech (each
 * row's rank label already names its zone), which also keeps the list's children list items.
 */
export function ZoneDivider({ zone }: { zone: DividerZone }) {
  const promotion = zone === "promotion";
  const arrow = promotion ? "rotate-90" : "-rotate-90";
  return (
    <li
      aria-hidden="true"
      data-testid={`${zone}-divider`}
      className={`flex items-center justify-center gap-2 py-3 text-button uppercase ${promotion ? "text-green" : "text-red"}`}
    >
      <ArrowLeft size={18} className={arrow} />
      {promotion ? leaderboardStrings.promotionZone : leaderboardStrings.demotionZone}
      <ArrowLeft size={18} className={arrow} />
    </li>
  );
}
