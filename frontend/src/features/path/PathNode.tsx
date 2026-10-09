import type { ComponentPropsWithRef } from "react";

import { Check, Chest, ChestOpen, Crown, Dumbbell, Star, Trophy } from "@/components/icons";
import type { PathNode as PathNodeData } from "@/lib/api/types";

import { CrownBadge } from "./CrownBadge";
import {
  nextLessonNumber,
  nodeProgress,
  nodeVisual,
  type NodeGlyph,
  type NodeTone,
} from "./nodeVisual";
import styles from "./path.module.css";
import { ProgressRing } from "./ProgressRing";
import { StartBubble } from "./StartBubble";
import { pathStrings } from "./strings";

export interface PathNodeProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  node: PathNodeData;
  /** The node just changed state (the learner is back from a lesson): pop once. */
  highlight?: boolean;
}

/** Coin face, 3D bottom edge and pressed edge for each tone. */
const COIN_TONE: Record<NodeTone, string> = {
  unit: "bg-(--unit-face) shadow-[0_8px_0_var(--unit-shade)] active:shadow-[0_4px_0_var(--unit-shade)]",
  gold: "bg-gold shadow-[0_8px_0_var(--gold-shade)] active:shadow-[0_4px_0_var(--gold-shade)]",
  locked:
    "bg-locked-face shadow-[0_8px_0_var(--locked-edge)] active:shadow-[0_4px_0_var(--locked-edge)]",
};

/**
 * One stop on the learning path: a "coin" with a 3D edge (or a chest), plus the decorations that
 * depend on its state (progress ring, START bubble, crown badge). Every other prop goes to the
 * button so Radix `Popover.Trigger asChild` can attach its handlers and ref.
 */
export function PathNode({ node, highlight = false, ...buttonProps }: PathNodeProps) {
  const visual = nodeVisual(node);
  const shape = visual.isChest
    ? "size-[72px] rounded-button active:translate-y-0.5"
    : `h-[57px] w-[70px] rounded-[50%] active:translate-y-1 ${COIN_TONE[visual.tone]}`;

  return (
    <div
      data-node-id={node.id}
      className={`relative flex h-[65px] w-[70px] justify-center ${visual.isChest ? "items-center" : "items-start"} ${highlight ? styles.celebrate : ""}`}
    >
      {visual.showRing ? <ProgressRing value={nodeProgress(node)} /> : null}
      {visual.showBubble ? (
        <StartBubble label={node.type === "chest" ? pathStrings.open : pathStrings.start} />
      ) : null}
      <button
        type="button"
        {...buttonProps}
        aria-label={nodeLabel(node)}
        data-node-state={node.state}
        data-node-type={node.type}
        data-glyph={visual.glyph}
        data-tone={visual.tone}
        className={`relative z-[1] grid shrink-0 place-items-center transition-[translate,box-shadow] duration-100 focus-visible:outline-offset-4 ${shape}`}
      >
        <NodeGlyphIcon glyph={visual.glyph} tone={visual.tone} />
      </button>
      {visual.crownLevel > 0 ? <CrownBadge level={visual.crownLevel === 2 ? 2 : 1} /> : null}
    </div>
  );
}

function NodeGlyphIcon({ glyph, tone }: { glyph: NodeGlyph; tone: NodeTone }) {
  const color = tone === "locked" ? "text-locked-icon" : "text-white";
  switch (glyph) {
    case "star":
      return <Star size={38} fill="currentColor" className={color} />;
    case "dumbbell":
      return <Dumbbell size={40} fill="currentColor" className={color} />;
    case "trophy":
      return <Trophy size={38} fill="currentColor" className={color} />;
    case "check":
      return <Check size={38} className={color} />;
    case "crown":
      return <Crown size={40} fill="currentColor" className={color} />;
    case "chest":
      return <Chest size={72} muted={tone === "locked"} />;
    case "chest-open":
      return <ChestOpen size={72} />;
  }
}

/** Screen-reader name that states what the node is and where the learner stands on it. */
export function nodeLabel(node: PathNodeData): string {
  const labels = pathStrings.nodeLabel;
  if (node.state === "locked") return labels.locked(node.title);
  if (node.type === "chest") {
    return node.state === "active"
      ? labels.activeChest(node.title)
      : labels.completedChest(node.title);
  }
  if (node.state === "active") {
    return labels.active(node.title, nextLessonNumber(node), node.lessons_total);
  }
  if (node.state === "legendary") return labels.legendary(node.title);
  return labels.completed(node.title, node.crown_level === 2 ? 2 : 1);
}
