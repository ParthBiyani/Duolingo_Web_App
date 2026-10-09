import type { PathNode } from "@/lib/api/types";

/** Which glyph is drawn on (or as) the node. */
export type NodeGlyph =
  "star" | "check" | "crown" | "trophy" | "dumbbell" | "chest" | "chest-open" | "jump";

/** Colour family of the node face: the unit's colour, legendary gold, or locked grey. */
export type NodeTone = "unit" | "gold" | "locked";

export interface NodeVisual {
  tone: NodeTone;
  glyph: NodeGlyph;
  /** Chests are drawn as a free-standing chest rather than a coin. */
  isChest: boolean;
  /** Progress ring around the active node (lessons done out of total). */
  showRing: boolean;
  /** Bobbing speech bubble above the node the learner should press next. */
  showBubble: boolean;
  /** Crown badge level in the corner; 0 hides the badge. */
  crownLevel: 0 | 1 | 2;
}

type NodeLike = Pick<PathNode, "type" | "state" | "icon" | "crown_level">;

const ICON_GLYPH: Record<PathNode["icon"], NodeGlyph> = {
  star: "star",
  dumbbell: "dumbbell",
  trophy: "trophy",
  chest: "chest",
};

/** Maps a node's type and state to how it is drawn. Pure, so every combination is testable. */
export function nodeVisual(node: NodeLike): NodeVisual {
  if (node.type === "chest") {
    const opened = node.state === "completed" || node.state === "legendary";
    return {
      tone: node.state === "locked" ? "locked" : "unit",
      glyph: opened ? "chest-open" : "chest",
      isChest: true,
      showRing: false,
      showBubble: node.state === "active",
      crownLevel: 0,
    };
  }

  const ownGlyph = ICON_GLYPH[node.icon];
  const isReview = node.type === "unit_review";

  switch (node.state) {
    case "active":
      return {
        tone: "unit",
        glyph: ownGlyph,
        isChest: false,
        showRing: true,
        showBubble: true,
        crownLevel: 0,
      };
    case "completed":
      return {
        tone: "unit",
        glyph: isReview ? "trophy" : "check",
        isChest: false,
        showRing: false,
        showBubble: false,
        crownLevel: node.crown_level === 2 ? 2 : 1,
      };
    case "legendary":
      return {
        tone: "gold",
        glyph: isReview ? "trophy" : "crown",
        isChest: false,
        showRing: false,
        showBubble: false,
        crownLevel: 2,
      };
    case "locked":
    default:
      return {
        tone: "locked",
        glyph: ownGlyph,
        isChest: false,
        showRing: false,
        showBubble: false,
        crownLevel: 0,
      };
  }
}

/** Fraction of the node's lessons completed, 0..1 (0 for nodes without lessons). */
export function nodeProgress(node: Pick<PathNode, "lessons_completed" | "lessons_total">): number {
  if (node.lessons_total <= 0) return 0;
  return Math.min(1, Math.max(0, node.lessons_completed / node.lessons_total));
}

/** 1-based number of the lesson the learner will play next, clamped to the total. */
export function nextLessonNumber(
  node: Pick<PathNode, "lessons_completed" | "lessons_total">,
): number {
  return Math.max(1, Math.min(node.lessons_total, node.lessons_completed + 1));
}
