import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { MeResponse } from "@/lib/api/types";

import { XpPopover } from "./stat-popovers";

type Stats = MeResponse["stats"];

beforeAll(() => {
  // Radix measures the popover with ResizeObserver, which jsdom does not implement.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

function makeStats(overrides: Partial<Stats> = {}): Stats {
  return {
    xp_total: 1240,
    today_xp: 8,
    daily_goal_xp: 20,
    gems: 500,
    hearts: 4,
    hearts_max: 5,
    next_heart_at: null,
    streak: { current: 12, longest: 21, extended_today: false, freezes: 1, week: [] },
    league: { tier: 1, name: "Silver", unlocked: true },
    ...overrides,
  };
}

async function openXp(stats: Stats) {
  render(<XpPopover stats={stats} />);
  await userEvent.click(screen.getByRole("button", { name: "Total XP: 1,240" }));
  return screen.getByRole("dialog");
}

describe("XpPopover", () => {
  it("shows total XP and how far today's goal is", async () => {
    const dialog = await openXp(makeStats());

    expect(dialog).toHaveTextContent("1,240 XP");
    expect(screen.getByRole("progressbar", { name: "Daily goal: 8 of 20 XP" })).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(dialog).toHaveTextContent("Earn 12 more XP to reach today's goal.");
    expect(screen.getByRole("link", { name: "Change daily goal" })).toHaveAttribute(
      "href",
      "/settings/preferences",
    );
  });

  it("celebrates a reached goal and caps the bar", async () => {
    const dialog = await openXp(makeStats({ today_xp: 25 }));

    expect(dialog).toHaveTextContent("You reached today's goal. Nice work!");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
