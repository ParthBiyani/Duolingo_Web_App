import type { LeaderboardRow, Zone } from "@/lib/api/types";

export type DividerZone = Exclude<Zone, "safe">;

export type LeaderboardItem =
  { kind: "row"; row: LeaderboardRow } | { kind: "divider"; zone: DividerZone };

/**
 * Interleaves the ranked rows with the zone dividers: the promotion divider goes after the last
 * promoted rank and the demotion divider before the first demoted rank. A divider is only drawn
 * when there are rows on both sides of it, so Bronze (no demotion) and Diamond (no promotion)
 * show a single divider or none.
 */
export function withZoneDividers(rows: readonly LeaderboardRow[]): LeaderboardItem[] {
  const lastPromoted = rows.findLastIndex((row) => row.zone === "promotion");
  const firstDemoted = rows.findIndex((row) => row.zone === "demotion");
  const items: LeaderboardItem[] = [];

  rows.forEach((row, index) => {
    if (index === firstDemoted && index > 0) items.push({ kind: "divider", zone: "demotion" });
    items.push({ kind: "row", row });
    if (index === lastPromoted && index < rows.length - 1) {
      items.push({ kind: "divider", zone: "promotion" });
    }
  });

  return items;
}
