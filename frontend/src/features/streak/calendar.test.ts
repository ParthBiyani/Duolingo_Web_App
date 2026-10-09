import { describe, expect, it } from "vitest";

import type { StreakCalendarResponse } from "@/lib/api";

import {
  goalProgress,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  type DayStatus,
} from "./calendar";

/** Every day of October 2026, with the given statuses by day of the month. */
function october(statuses: Partial<Record<number, DayStatus>>): StreakCalendarResponse["days"] {
  return Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    return {
      date: `2026-10-${String(day).padStart(2, "0")}`,
      status: statuses[day] ?? (day < 9 ? "missed" : day === 9 ? "pending" : "future"),
    };
  });
}

describe("monthGrid", () => {
  it("lays the month out in Monday-first weeks padded with empty days", () => {
    const weeks = monthGrid("2026-10", october({}), "2026-10-09");
    expect(weeks).toHaveLength(5);
    // 1 October 2026 is a Thursday.
    expect(weeks[0].cells.slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0].cells[3]?.day).toBe(1);
    expect(weeks[4].cells.map((cell) => cell?.day ?? null)).toEqual([26, 27, 28, 29, 30, 31, null]);
    expect(weeks.flatMap((week) => week.cells).filter((cell) => cell?.isToday)).toEqual([
      { day: 9, date: "2026-10-09", status: "pending", isToday: true },
    ]);
  });

  it("needs six weeks for a month that starts on a Sunday", () => {
    const days = Array.from({ length: 31 }, (_, index) => ({
      date: `2026-03-${String(index + 1).padStart(2, "0")}`,
      status: "missed" as const,
    }));
    const weeks = monthGrid("2026-03", days, "2026-10-09");
    expect(weeks).toHaveLength(6);
    expect(weeks[0].cells[6]?.day).toBe(1);
  });

  it("joins consecutive streak days within a week, frozen days included", () => {
    const weeks = monthGrid(
      "2026-10",
      october({ 1: "extended", 6: "extended", 7: "frozen", 8: "extended", 11: "extended" }),
      "2026-10-09",
    );
    expect(weeks[0].runs).toEqual([]); // a single streak day has no band
    expect(weeks[1].runs).toEqual([{ start: 1, end: 3 }]); // Tuesday 6 to Thursday 8
  });

  it("closes a run at the end of the week and starts a new one on Monday", () => {
    const weeks = monthGrid(
      "2026-10",
      october({ 10: "extended", 11: "extended", 12: "extended", 13: "extended" }),
      "2026-10-09",
    );
    expect(weeks[1].runs).toEqual([{ start: 5, end: 6 }]);
    expect(weeks[2].runs).toEqual([{ start: 0, end: 1 }]);
  });
});

describe("month helpers", () => {
  it("moves between months across years", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("names a month and finds a date's month", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(monthOf("2026-10-09")).toBe("2026-10");
  });
});

describe("goalProgress", () => {
  it("measures the way from the last goal to the next", () => {
    expect(goalProgress(2, 1, 7)).toBeCloseTo(1 / 6);
    expect(goalProgress(12, 7, 14)).toBeCloseTo(5 / 7);
  });

  it("stays between 0 and 1", () => {
    expect(goalProgress(0, 1, 7)).toBe(0);
    expect(goalProgress(20, 7, 14)).toBe(1);
    expect(goalProgress(7, 7, 7)).toBe(1);
  });
});
