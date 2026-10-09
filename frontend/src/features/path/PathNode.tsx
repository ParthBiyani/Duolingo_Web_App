import type { ComponentPropsWithRef } from "react";

import { Crown, DuoImage, Dumbbell } from "@/components/icons";
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
    ? "h-[90px] w-[80px] rounded-button active:translate-y-0.5"
    : `h-[57px] w-[70px] rounded-[50%] active:translate-y-1 ${COIN_TONE[visual.tone]}`;

  return (
    <div
      data-node-id={node.id}
      className={`group/node relative flex h-[65px] w-[70px] justify-center ${visual.isChest ? "items-center" : "items-start"} ${highlight ? styles.celebrate : ""}`}
    >
      {visual.showRing ? <ProgressRing value={nodeProgress(node)} /> : null}
      {visual.showBubble ? (
        <StartBubble
          label={node.type === "chest" ? pathStrings.open : pathStrings.start}
          className="group-has-[button[data-state=open]]/node:hidden"
        />
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
  const locked = tone === "locked";
  switch (glyph) {
    case "star":
      return <DuoImage name={locked ? "node-star-locked" : "node-star"} size={42} />;
    case "dumbbell":
      return locked ? (
        <DuoImage name="node-dumbbell-locked" size={42} />
      ) : (
        <Dumbbell size={40} fill="currentColor" className="text-white" />
      );
    case "trophy":
      return <DuoImage name={locked ? "node-trophy-locked" : "node-trophy"} size={42} />;
    case "check":
      return <DuoImage name="node-check" size={42} />;
    case "crown":
      return (
        <Crown
          size={40}
          fill="currentColor"
          className={locked ? "text-locked-icon" : "text-white"}
        />
      );
    case "chest":
      return locked ? (
        <>
          <DuoImage name="chest-locked-light" size={80} className="dark:hidden" />
          <DuoImage name="chest-locked" size={80} className="hidden dark:block" />
        </>
      ) : (
        <DuoImage name="chest" size={80} />
      );
    case "chest-open":
      return <DuoImage name="chest-open" size={80} />;
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
