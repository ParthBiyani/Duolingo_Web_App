import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { PathNode as PathNodeData } from "@/lib/api/types";

import { NodePopover, type OpenChestHandler } from "./NodePopover";
import { PathNode } from "./PathNode";
import { makeChest, makeNode } from "./testNodes";

beforeAll(() => {
  // Radix measures the popover with ResizeObserver, which jsdom does not implement.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

async function openPopover(node: PathNodeData, onOpenChest: OpenChestHandler = vi.fn()) {
  render(
    <NodePopover node={node} color="purple" onOpenChest={onOpenChest}>
      <PathNode node={node} />
    </NodePopover>,
  );
  await userEvent.click(screen.getByRole("button"));
  return screen.getByRole("dialog");
}

describe("NodePopover", () => {
  it("starts the next lesson of the active skill", async () => {
    const dialog = await openPopover(makeNode({ state: "active", lessons_completed: 1 }));

    expect(dialog).toHaveTextContent("Lesson 2 of 3");
    expect(screen.getByRole("link", { name: "Start +10 XP" })).toHaveAttribute(
      "href",
      "/lesson/15",
    );
  });

  it("offers review and the legendary challenge on a completed skill", async () => {
    await openPopover(
      makeNode({
        id: 2,
        state: "completed",
        lessons_completed: 3,
        crown_level: 1,
        next_lesson_id: 4,
      }),
    );

    expect(screen.getByRole("link", { name: "Review +5 XP" })).toHaveAttribute(
      "href",
      "/lesson/4?kind=review",
    );
    expect(screen.getByRole("link", { name: "Legendary +40 XP" })).toHaveAttribute(
      "href",
      "/legendary/2",
    );
  });

  it("explains a locked level and disables its button", async () => {
    const dialog = await openPopover(makeNode({ state: "locked" }));

    expect(dialog).toHaveTextContent("Complete all levels above to unlock this!");
    expect(screen.getByRole("button", { name: "Locked" })).toBeDisabled();
  });

  it("claims a reachable chest and closes once the gems are granted", async () => {
    const onOpenChest = vi.fn<OpenChestHandler>().mockResolvedValue(true);
    const chest = makeChest({ state: "active" });
    await openPopover(chest, onOpenChest);

    await userEvent.click(screen.getByRole("button", { name: "Open chest" }));

    expect(onOpenChest).toHaveBeenCalledWith(chest);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
