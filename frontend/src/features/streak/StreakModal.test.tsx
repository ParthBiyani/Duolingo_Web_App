import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createQueryClient, type StreakCalendarResponse } from "@/lib/api";

import { StreakModal, type StreakSummary } from "./StreakModal";

function monthDays(month: string, length: number, extended: number[]) {
  return Array.from({ length }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const status = extended.includes(day)
      ? ("extended" as const)
      : date === "2026-10-09"
        ? ("pending" as const)
        : date > "2026-10-09"
          ? ("future" as const)
          : ("missed" as const);
    return { date, status };
  });
}

function calendarFor(month: string, overrides: Partial<StreakCalendarResponse> = {}) {
  const days =
    month === "2026-09"
      ? monthDays("2026-09", 30, [1, 2, 3, 27, 28, 29, 30])
      : monthDays("2026-10", 31, [1, 2, 3, 4, 5, 6, 7, 8]);
  return {
    month,
    today: "2026-10-09",
    first_month: "2026-08",
    current: 2,
    longest: 21,
    extended_today: false,
    freezes: 1,
    goal: { start: 1, target: 7 },
    days,
    ...overrides,
  } satisfies StreakCalendarResponse;
}

function renderModal(
  streak: StreakSummary = { current: 2, extended_today: false },
  overrides: Partial<StreakCalendarResponse> = {},
) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const month = new URL(url, "http://localhost").searchParams.get("month") ?? "2026-10";
    return Response.json(calendarFor(month, { ...streak, ...overrides }));
  });
  const onOpenChange = vi.fn();
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  render(
    <QueryClientProvider client={client}>
      <StreakModal open onOpenChange={onOpenChange} streak={streak} />
    </QueryClientProvider>,
  );
  return { fetchMock, onOpenChange };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StreakModal", () => {
  it("is a dialog named Streak with the streak in the hero", async () => {
    renderModal();
    const dialog = screen.getByRole("dialog", { name: "Streak" });
    expect(within(dialog).getByRole("heading", { name: "2 day streak" })).toBeInTheDocument();
    expect(
      within(dialog).getAllByText(/haven't extended your streak today/).length,
    ).toBeGreaterThan(0);
    expect(await screen.findByText("October 2026")).toBeInTheDocument();
  });

  it("marks streak days on the calendar and limits navigation to the learner's months", async () => {
    renderModal();
    await screen.findByText("October 2026");
    expect(screen.getByText("Thursday 8: streak extended")).toBeInTheDocument();
    expect(screen.getByText("Friday 9: today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeEnabled();
  });

  it("loads the previous month", async () => {
    const { fetchMock } = renderModal();
    await screen.findByText("October 2026");
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByText("September 2026")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/streak/calendar?month=2026-09"),
      expect.anything(),
    );
    expect(screen.getByText("Wednesday 30: streak extended")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeEnabled();
  });

  it("shows the progress towards the next streak goal", async () => {
    renderModal();
    const goal = await screen.findByRole("progressbar", { name: "Streak Goal" });
    expect(goal).toHaveAttribute("aria-valuemin", "1");
    expect(goal).toHaveAttribute("aria-valuemax", "7");
    expect(goal).toHaveAttribute("aria-valuenow", "2");
  });

  it("invites learners below 7 days to the Streak Society and welcomes members", async () => {
    renderModal();
    expect(screen.getByText(/Reach a 7 day streak to join/)).toBeInTheDocument();
    cleanup();
    vi.restoreAllMocks();

    renderModal({ current: 12, extended_today: true }, { goal: { start: 7, target: 14 } });
    expect(await screen.findByText(/member of the Streak Society/)).toBeInTheDocument();
    expect(screen.getAllByText(/You extended your streak today/).length).toBeGreaterThan(0);
  });

  it("switches to the Friends tab", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("tab", { name: "Friends" }));
    expect(screen.getByRole("tab", { name: "Friends" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Friend Streaks are coming soon.")).toBeInTheDocument();
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
  });

  it("closes with the X button and with Escape", async () => {
    const { onOpenChange } = renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
