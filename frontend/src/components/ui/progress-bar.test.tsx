import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { clampProgress, ProgressBar } from "./progress-bar";

const fillOf = (bar: HTMLElement) => bar.querySelector<HTMLElement>(".ui-progress-fill");

afterEach(cleanup);

describe("ProgressBar", () => {
  it("exposes the value as an accessible percentage", () => {
    render(<ProgressBar value={0.4} aria-label="Lesson progress" />);
    const bar = screen.getByRole("progressbar", { name: "Lesson progress" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(fillOf(bar)).toHaveStyle({ width: "40%" });
  });

  it("clamps values outside 0..1", () => {
    const { rerender } = render(<ProgressBar value={1.7} aria-label="Quest" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(fillOf(screen.getByRole("progressbar"))).toHaveStyle({ width: "100%" });

    rerender(<ProgressBar value={-0.2} aria-label="Quest" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(fillOf(screen.getByRole("progressbar"))).toHaveStyle({ width: "0%" });
  });

  it("keeps a visible sliver once there is any progress", () => {
    const { rerender } = render(<ProgressBar value={0.01} aria-label="Lesson progress" />);
    expect(fillOf(screen.getByRole("progressbar"))?.style.minWidth).toBe("1rem");

    rerender(<ProgressBar value={0} aria-label="Lesson progress" />);
    expect(fillOf(screen.getByRole("progressbar"))?.style.minWidth).toBe("0px");
  });

  it("uses the green fill unless another colour is given", () => {
    const { rerender } = render(<ProgressBar value={0.5} aria-label="Quest" />);
    expect(screen.getByRole("progressbar")).toHaveClass("ui-progress", "ui-progress-green");

    rerender(<ProgressBar value={0.5} color="gold" aria-label="Quest" />);
    expect(screen.getByRole("progressbar")).toHaveClass("ui-progress-gold");
  });

  it("renders a centred label over the bar", () => {
    render(<ProgressBar value={0.6} label="12 / 20" aria-label="Earn 20 XP" />);
    expect(screen.getByText("12 / 20")).toHaveClass("ui-progress-label");
  });
});

describe("clampProgress", () => {
  it.each([
    [0.25, 0.25],
    [0, 0],
    [1, 1],
    [2, 1],
    [-1, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampProgress(input)).toBe(expected);
  });
});
