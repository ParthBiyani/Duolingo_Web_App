import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PathNode } from "./PathNode";
import { makeChest, makeNode } from "./testNodes";

afterEach(cleanup);

function renderNode(...args: Parameters<typeof makeNode>) {
  render(<PathNode node={makeNode(...args)} />);
  return screen.getByRole("button");
}

describe("PathNode", () => {
  it("shows the active level with its progress ring and START bubble", () => {
    const button = renderNode({ state: "active", lessons_completed: 1 });

    expect(button).toHaveAccessibleName("My day, current level, lesson 2 of 3");
    expect(button).toHaveAttribute("data-tone", "unit");
    expect(button).toHaveAttribute("data-glyph", "star");
    expect(screen.getByTestId("progress-ring")).toHaveAttribute("data-progress", "0.33");
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.queryByTestId("crown-badge")).not.toBeInTheDocument();
  });

  it("shows a check and a level 1 crown on a completed level", () => {
    const button = renderNode({ state: "completed", lessons_completed: 3, crown_level: 1 });

    expect(button).toHaveAccessibleName("My day, completed, crown level 1");
    expect(button).toHaveAttribute("data-glyph", "check");
    expect(within(screen.getByTestId("crown-badge")).getByText("1")).toBeInTheDocument();
    expect(screen.queryByTestId("progress-ring")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });

  it("paints a legendary level gold with a level 2 crown", () => {
    const button = renderNode({ state: "legendary", lessons_completed: 3, crown_level: 2 });

    expect(button).toHaveAccessibleName("My day, legendary");
    expect(button).toHaveAttribute("data-tone", "gold");
    expect(button).toHaveAttribute("data-glyph", "crown");
    expect(within(screen.getByTestId("crown-badge")).getByText("2")).toBeInTheDocument();
  });

  it("greys out a locked level without ring, bubble or crown", () => {
    const button = renderNode({ state: "locked" });

    expect(button).toHaveAccessibleName("My day, locked");
    expect(button).toHaveAttribute("data-tone", "locked");
    expect(screen.queryByTestId("progress-ring")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
    expect(screen.queryByTestId("crown-badge")).not.toBeInTheDocument();
  });

  it("draws a reachable chest closed with an OPEN bubble, and opened once claimed", () => {
    const { unmount } = render(<PathNode node={makeChest({ state: "active" })} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Treasure chest, ready to open");
    expect(screen.getByRole("button")).toHaveAttribute("data-glyph", "chest");
    expect(screen.getByText("Open")).toBeInTheDocument();
    unmount();

    render(<PathNode node={makeChest({ state: "completed", chest_claimed: true })} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-glyph", "chest-open");
    expect(screen.queryByText("Open")).not.toBeInTheDocument();
  });
});
