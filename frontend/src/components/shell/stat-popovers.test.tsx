import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

  it("names its panel after the heading, as a dialog must be named", async () => {
    await openXp(makeStats());

    expect(screen.getByRole("dialog", { name: "1,240 XP" })).toBeVisible();
  });

  it("opens on hover, stays open when the hovered stat is clicked, and closes from its panel", async () => {
    const user = userEvent.setup();
    render(<XpPopover stats={makeStats()} />);
    const stat = screen.getByRole("button", { name: "Total XP: 1,240" });

    await user.hover(stat);
    expect(await screen.findByRole("dialog")).toBeVisible();
    await user.click(stat); // the mouse opened it: a click must not toggle it shut
    expect(screen.getByRole("dialog")).toBeVisible();

    // With the mouse on the panel, closing it (Escape, or a link inside) closes it.
    await user.hover(screen.getByRole("dialog"));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("celebrates a reached goal and caps the bar", async () => {
    const dialog = await openXp(makeStats({ today_xp: 25 }));

    expect(dialog).toHaveTextContent("You reached today's goal. Nice work!");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
