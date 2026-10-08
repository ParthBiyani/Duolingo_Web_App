import { describe, expect, it } from "vitest";

import { accuracyTier, formatDuration, formatPercent } from "./celebrate/stats";
import { digitIndex, digitLabel, isOwnEnterTarget, isTypingTarget, OPTION_ATTR } from "./keyboard";

describe("keyboard map", () => {
  it("maps 1-9 to the first nine items and 0 to the tenth", () => {
    expect(digitIndex("1")).toBe(0);
    expect(digitIndex("9")).toBe(8);
    expect(digitIndex("0")).toBe(9);
    expect(digitIndex("a")).toBeNull();
    expect(digitIndex("Enter")).toBeNull();
    expect(digitIndex("")).toBeNull();
  });

  it("labels badges 1-9 then 0", () => {
    expect([0, 1, 8, 9].map(digitLabel)).toEqual(["1", "2", "9", "0"]);
  });

  it("leaves keys typed into text fields alone", () => {
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    expect(isTypingTarget(checkbox)).toBe(false);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it("lets focused buttons handle Enter, except exercise options", () => {
    const button = document.createElement("button");
    expect(isOwnEnterTarget(button)).toBe(true);

    const option = document.createElement("button");
    option.setAttribute(OPTION_ATTR, "");
    expect(isOwnEnterTarget(option)).toBe(false);

    const icon = document.createElement("span");
    option.appendChild(icon);
    expect(isOwnEnterTarget(icon)).toBe(false);

    expect(isOwnEnterTarget(document.createElement("div"))).toBe(false);
    expect(isOwnEnterTarget(document.body)).toBe(false);
  });
});

describe("lesson complete stats", () => {
  it("labels accuracy", () => {
    expect(accuracyTier(100)).toBe("amazing");
    expect(accuracyTier(95)).toBe("amazing");
    expect(accuracyTier(94)).toBe("great");
    expect(accuracyTier(80)).toBe("great");
    expect(accuracyTier(79)).toBe("good");
    expect(accuracyTier(0)).toBe("good");
  });

  it("formats percentages and durations", () => {
    expect(formatPercent(87.6)).toBe("88%");
    expect(formatPercent(140)).toBe("100%");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600.4)).toBe("10:00");
  });
});
