import { describe, expect, it } from "vitest";

import { secondsUntilNextMonday } from "./nextMonday";

describe("secondsUntilNextMonday", () => {
  it("counts to Monday 00:00 in the learner's time zone, not UTC", () => {
    // Friday 07:20 in Kolkata; the week ends Monday 00:00 IST = Sunday 18:30 UTC.
    const now = new Date("2026-10-09T01:50:00Z");
    expect(secondsUntilNextMonday(now, "Asia/Kolkata", 0)).toBe(2 * 86_400 + 16 * 3_600 + 40 * 60);
  });

  it("targets the following Monday when it already is Monday midnight", () => {
    const mondayMidnightIst = new Date("2026-10-11T18:30:00Z");
    expect(secondsUntilNextMonday(mondayMidnightIst, "Asia/Kolkata", 0)).toBe(7 * 86_400);
  });

  it("handles a daylight-saving change before the target", () => {
    // Friday noon in New York (EST); DST starts on Sunday 8 March 2026, so Monday is EDT (UTC-4).
    const now = new Date("2026-03-06T17:00:00Z");
    expect(secondsUntilNextMonday(now, "America/New_York", 0)).toBe(2 * 86_400 + 11 * 3_600);
  });

  it("adds the safety margin", () => {
    const now = new Date("2026-10-09T01:50:00Z");
    expect(secondsUntilNextMonday(now, "Asia/Kolkata")).toBe(
      secondsUntilNextMonday(now, "Asia/Kolkata", 0) + 5,
    );
  });
});
