import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  computeClockOffset,
  formatCountdown,
  formatTimeLeft,
  readServerNow,
  ServerClockContext,
  useServerNow,
} from "./time";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatCountdown", () => {
  it.each([
    [0, "00:00"],
    [999, "00:01"],
    [SECOND, "00:01"],
    [59 * SECOND, "00:59"],
    [61 * SECOND, "01:01"],
    [9 * MINUTE + 5 * SECOND, "09:05"],
    [HOUR - SECOND, "59:59"],
    [HOUR, "1:00:00"],
    [4 * HOUR + 59 * MINUTE + 59 * SECOND, "4:59:59"],
    [5 * HOUR - 1, "5:00:00"],
    [26 * HOUR + 3 * MINUTE, "26:03:00"],
  ])("formats %i ms as %s", (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });

  it("never goes below zero", () => {
    expect(formatCountdown(-5 * SECOND)).toBe("00:00");
  });

  it("treats invalid input as zero", () => {
    expect(formatCountdown(Number.NaN)).toBe("00:00");
  });
});

describe("formatTimeLeft", () => {
  it.each([
    [3 * DAY + 5 * HOUR, "3 days"],
    [DAY, "1 day"],
    [5 * HOUR + 59 * MINUTE, "5 hours"],
    [HOUR, "1 hour"],
    [12 * MINUTE + 1, "13 minutes"],
    [30 * SECOND, "1 minute"],
    [0, "1 minute"],
  ])("formats %i ms as %s", (ms, expected) => {
    expect(formatTimeLeft(ms)).toBe(expected);
  });
});

describe("server clock helpers", () => {
  it("measures how far the server clock runs ahead of the browser", () => {
    const receivedAt = Date.parse("2026-10-09T10:00:00Z");
    expect(computeClockOffset("2026-10-09T15:00:00Z", receivedAt)).toBe(5 * HOUR);
    expect(computeClockOffset("2026-10-09T09:59:58Z", receivedAt)).toBe(-2 * SECOND);
  });

  it("ignores unparsable timestamps", () => {
    expect(computeClockOffset("not a date", Date.now())).toBe(0);
  });

  it("reads server_now only when a payload carries it", () => {
    expect(readServerNow({ server_now: "2026-10-09T10:00:00Z", hearts: 5 })).toBe(
      "2026-10-09T10:00:00Z",
    );
    expect(readServerNow({ hearts: 5 })).toBeNull();
    expect(readServerNow({ server_now: 42 })).toBeNull();
    expect(readServerNow(null)).toBeNull();
    expect(readServerNow("2026-10-09T10:00:00Z")).toBeNull();
  });
});

describe("useServerNow", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("returns server time and ticks every second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-10-09T10:00:00.250Z"));
    const offset = 5 * HOUR;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ServerClockContext value={offset}>{children}</ServerClockContext>
    );

    const { result } = renderHook(() => useServerNow(), { wrapper });
    expect(result.current).toBe(Date.parse("2026-10-09T15:00:00Z"));

    act(() => {
      vi.advanceTimersByTime(SECOND);
    });
    expect(result.current).toBe(Date.parse("2026-10-09T15:00:01Z"));
  });
});
