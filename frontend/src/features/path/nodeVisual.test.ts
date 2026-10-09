import { describe, expect, it } from "vitest";

import { nextLessonNumber, nodeProgress, nodeVisual } from "./nodeVisual";
import { makeChest, makeNode } from "./testNodes";

describe("nodeVisual", () => {
  it("draws the active lesson in the unit colour with its ring and bubble", () => {
    expect(nodeVisual(makeNode({ state: "active" }))).toMatchObject({
      tone: "unit",
      glyph: "star",
      showRing: true,
      showBubble: true,
      crownLevel: 0,
    });
  });

  it("marks completed lessons with a check and crown level 1", () => {
    expect(nodeVisual(makeNode({ state: "completed", crown_level: 1 }))).toMatchObject({
      tone: "unit",
      glyph: "check",
      showRing: false,
      crownLevel: 1,
    });
  });

  it("turns legendary skills gold with crown level 2", () => {
    expect(nodeVisual(makeNode({ state: "legendary", crown_level: 2 }))).toMatchObject({
      tone: "gold",
      glyph: "crown",
      crownLevel: 2,
    });
  });

  it("greys out locked nodes but keeps their own icon", () => {
    expect(nodeVisual(makeNode({ type: "unit_review", icon: "trophy" }))).toMatchObject({
      tone: "locked",
      glyph: "trophy",
      showBubble: false,
      crownLevel: 0,
    });
  });

  it("keeps the trophy on a completed unit review", () => {
    expect(
      nodeVisual(makeNode({ type: "unit_review", icon: "trophy", state: "completed" })).glyph,
    ).toBe("trophy");
  });

  it("draws chests as chests: closed until claimed, without ring or crown", () => {
    expect(nodeVisual(makeChest({ state: "active" }))).toMatchObject({
      isChest: true,
      glyph: "chest",
      showRing: false,
      showBubble: true,
      crownLevel: 0,
    });
    expect(nodeVisual(makeChest({ state: "completed" })).glyph).toBe("chest-open");
    expect(nodeVisual(makeChest({ state: "locked" })).tone).toBe("locked");
  });
});

describe("lesson progress", () => {
  it("is the share of lessons done, 0 for nodes without lessons", () => {
    expect(nodeProgress({ lessons_completed: 1, lessons_total: 3 })).toBeCloseTo(1 / 3);
    expect(nodeProgress({ lessons_completed: 0, lessons_total: 0 })).toBe(0);
    expect(nodeProgress({ lessons_completed: 5, lessons_total: 3 })).toBe(1);
  });

  it("numbers the next lesson from 1 and never past the total", () => {
    expect(nextLessonNumber({ lessons_completed: 0, lessons_total: 3 })).toBe(1);
    expect(nextLessonNumber({ lessons_completed: 1, lessons_total: 3 })).toBe(2);
    expect(nextLessonNumber({ lessons_completed: 3, lessons_total: 3 })).toBe(3);
  });
});
