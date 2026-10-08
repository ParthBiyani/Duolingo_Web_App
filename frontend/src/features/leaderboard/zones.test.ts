import { describe, expect, it } from "vitest";

import type { LeaderboardRow, Zone } from "@/lib/api/types";

import { badgeWindowStart } from "./LeagueBadgeStrip";
import { withZoneDividers } from "./zones";

/** 30 rows whose zones follow the given promotion and demotion counts. */
function table(promote: number, demote: number): LeaderboardRow[] {
  return Array.from({ length: 30 }, (_, index) => {
    const rank = index + 1;
    const zone: Zone = rank <= promote ? "promotion" : rank > 30 - demote ? "demotion" : "safe";
    return {
      rank,
      user_id: rank,
      display_name: `Learner ${rank}`,
      avatar_color: "#1CB0F6",
      xp: 600 - rank * 10,
      is_me: rank === 12,
      zone,
    };
  });
}

/** Where the dividers land, written as "after rank N". */
function dividerPositions(rows: LeaderboardRow[]) {
  const items = withZoneDividers(rows);
  return items.flatMap((item, index) => {
    if (item.kind !== "divider") return [];
    const before = items[index - 1];
    return [`${item.zone} after ${before?.kind === "row" ? before.row.rank : "?"}`];
  });
}

describe("withZoneDividers", () => {
  it("separates the promotion and demotion zones (Silver: top 15 up, bottom 5 down)", () => {
    expect(dividerPositions(table(15, 5))).toEqual(["promotion after 15", "demotion after 25"]);
  });

  it("has no demotion zone in Bronze", () => {
    expect(dividerPositions(table(20, 0))).toEqual(["promotion after 20"]);
  });

  it("has no promotion zone in Diamond", () => {
    expect(dividerPositions(table(0, 5))).toEqual(["demotion after 25"]);
  });

  it("keeps every row, in rank order", () => {
    const rows = withZoneDividers(table(15, 5)).flatMap((item) =>
      item.kind === "row" ? [item.row.rank] : [],
    );
    expect(rows).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it("draws no divider at the very top or bottom of the table", () => {
    expect(dividerPositions(table(30, 0))).toEqual([]);
    expect(dividerPositions(table(0, 30))).toEqual([]);
  });
});

describe("badgeWindowStart", () => {
  it("centres the learner's league when it can", () => {
    expect(badgeWindowStart(10, 5)).toBe(3);
  });

  it("stays inside the list at both ends", () => {
    expect(badgeWindowStart(10, 0)).toBe(0);
    expect(badgeWindowStart(10, 1)).toBe(0);
    expect(badgeWindowStart(10, 9)).toBe(5);
  });
});
