import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createQueryClient,
  keepLeagueResult,
  keptLeagueResult,
  type LeaderboardResponse,
  type Zone,
} from "@/lib/api";

import { LeaderboardScreen } from "./LeaderboardScreen";

const TIERS = ["Bronze", "Silver", "Gold", "Sapphire", "Ruby"].map((name, tier) => ({
  tier,
  name,
  color: "#C0C0C0",
}));

function board(overrides: Partial<LeaderboardResponse> = {}): LeaderboardResponse {
  return {
    unlocked: true,
    lessons_to_unlock: 0,
    tier: 1,
    name: "Silver",
    tiers: TIERS,
    week_start: "2026-10-05",
    ends_at: "2026-10-11T18:30:00Z",
    promote_count: 15,
    demote_count: 5,
    rows: Array.from({ length: 30 }, (_, index) => {
      const rank = index + 1;
      const zone: Zone = rank <= 15 ? "promotion" : rank > 25 ? "demotion" : "safe";
      return {
        rank,
        user_id: rank,
        display_name: rank === 12 ? "Parth Biyani" : `Rival ${rank}`,
        avatar_color: "#FF4B4B",
        xp: 700 - rank * 20,
        is_me: rank === 12,
        zone,
      };
    }),
    last_result: null,
    server_now: "2026-10-09T01:50:00Z",
    ...overrides,
  };
}

function renderWith(response: LeaderboardResponse) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(response));
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  render(
    <QueryClientProvider client={client}>
      <LeaderboardScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("LeaderboardScreen", () => {
  it("lists the league with the promotion and demotion zones marked", async () => {
    renderWith(board());

    const list = await screen.findByRole("list", { name: "Silver League" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(30);
    expect(screen.getByText("Top 15 advance to the next league")).toBeInTheDocument();

    // Dividers are decorative; their position is checked through the DOM order.
    const promotion = screen.getByTestId("promotion-divider");
    const demotion = screen.getByTestId("demotion-divider");
    expect(promotion.previousElementSibling).toHaveTextContent("Rival 15");
    expect(promotion.nextElementSibling).toHaveTextContent("Rival 16");
    expect(demotion.previousElementSibling).toHaveTextContent("Rival 25");
    expect(demotion.nextElementSibling).toHaveTextContent("Rival 26");

    // Rank labels carry the zone for screen readers; the podium shows medals.
    expect(
      within(rows[0]).getByRole("img", { name: "Rank 1, promotion zone" }),
    ).toBeInTheDocument();
    expect(within(rows[27]).getByText("Rank 28, demotion zone")).toBeInTheDocument();
  });

  it("highlights the learner's own row", async () => {
    renderWith(board());

    const me = (await screen.findByText("Parth Biyani")).closest("li");
    expect(me).toHaveAttribute("aria-current", "true");
    expect(me).toHaveClass("bg-selected-bg");
  });

  it("shows last week's result even after another learner on this device saw theirs", async () => {
    localStorage.setItem("leaderboard:result-seen-week:7", "2026-10-05");
    renderWith(
      board({
        last_result: { tier_before: 0, tier_after: 1, outcome: "promoted", rank: 2, gems: 10 },
      }),
    );

    expect(
      await screen.findByRole("dialog", { name: "You've been promoted to the Silver League!" }),
    ).toBeInTheDocument();
    expect(screen.getByText("You earned 10 gems for a top 3 finish.")).toBeInTheDocument();
  });

  it("shows last week's result that another screen's read of the table received", async () => {
    // The rail's league card read the table first, so the API no longer reports the result.
    keepLeagueResult(
      board({
        last_result: { tier_before: 1, tier_after: 2, outcome: "promoted", rank: 3, gems: 5 },
      }),
    );
    renderWith(board());

    expect(
      await screen.findByRole("dialog", { name: "You've been promoted to the Gold League!" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/You finished #3 last week\./)).toBeInTheDocument();
  });

  it("keeps a reported result for the week it was reported in only", async () => {
    keepLeagueResult(
      board({
        week_start: "2026-09-28",
        last_result: { tier_before: 1, tier_after: 2, outcome: "promoted", rank: 3, gems: 5 },
      }),
    );
    renderWith(board());

    await screen.findByRole("list", { name: "Silver League" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stores the result of every read of the table", async () => {
    const result = { tier_before: 1, tier_after: 1, outcome: "stayed", rank: 9, gems: 0 } as const;
    renderWith(board({ last_result: result }));
    await screen.findByRole("dialog");

    expect(keptLeagueResult(board())).toEqual(result);
  });

  it("does not show a result the learner already dismissed this week", async () => {
    localStorage.setItem("leaderboard:result-seen-week:12", "2026-10-05");
    renderWith(
      board({
        last_result: { tier_before: 0, tier_after: 1, outcome: "promoted", rank: 2, gems: 10 },
      }),
    );

    await screen.findByRole("list", { name: "Silver League" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows how many lessons unlock the leaderboard for new learners", async () => {
    renderWith(board({ unlocked: false, lessons_to_unlock: 3, rows: [] }));

    expect(await screen.findByText("Unlock Leaderboards!")).toBeInTheDocument();
    expect(screen.getByText("Complete 3 more lessons to start competing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a lesson" })).toHaveAttribute("href", "/learn");
  });
});
