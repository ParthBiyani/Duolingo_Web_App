"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { MascotPose } from "@/components/mascot";
import type { PathResponse } from "@/lib/api/types";

import { JumpBackButton, type JumpDirection } from "./JumpBackButton";
import { ACTIVE_NODE_EXTRA_SPACE, mascotSideFor, nodeOffset } from "./layout";
import { NodePopover, type OpenChestHandler } from "./NodePopover";
import { PathMascot } from "./PathMascot";
import { PathNode } from "./PathNode";
import { pathStrings } from "./strings";
import { UnitBanner } from "./UnitBanner";
import { unitColorStyle } from "./unitColors";
import { UnitDivider } from "./UnitDivider";

const MASCOT_POSES: MascotPose[] = ["cheer", "idle", "celebrate"];

/** Space kept between the banner and the active node when scrolling to it (fits the bubble). */
const ACTIVE_SCROLL_GAP = 110;

interface LearningPathProps {
  path: PathResponse;
  /** Node to pop once, e.g. the skill the learner just finished. */
  highlightNodeId: number | null;
  onGuidebook: () => void;
  onOpenChest: OpenChestHandler;
}

/**
 * The learning path: one sticky banner showing the unit on screen, then every unit's nodes in a
 * zig-zag. On load it scrolls the active node into view; when that node is scrolled away a
 * floating button brings it back.
 */
export function LearningPath({
  path,
  highlightNodeId,
  onGuidebook,
  onOpenChest,
}: LearningPathProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const activeRef = useRef<HTMLDivElement>(null);
  const { unitIndex, jump } = usePathScroll(bannerRef, sectionRefs, activeRef);
  const currentUnit = path.units[Math.min(unitIndex, path.units.length - 1)];

  /**
   * Brings the active node to just below the sticky banner, leaving room for its START bubble,
   * so the banner shows the active node's unit. scroll-margin works for any scroll container.
   */
  const scrollToActive = useCallback((behavior: ScrollBehavior) => {
    const banner = bannerRef.current;
    const active = activeRef.current;
    if (!banner || !active) return;
    const stuckBottom =
      (Number.parseFloat(getComputedStyle(banner).top) || 0) + banner.offsetHeight;
    active.style.scrollMarginTop = `${stuckBottom + ACTIVE_SCROLL_GAP}px`;
    active.scrollIntoView({ block: "start", behavior });
  }, []);

  useEffect(() => {
    scrollToActive("auto");
  }, [scrollToActive]);

  const jumpToActive = useCallback(() => {
    scrollToActive(prefersMotion() ? "smooth" : "auto");
  }, [scrollToActive]);

  return (
    // --zigzag narrows the swing on phones so nodes and mascots stay inside the column.
    <div className="mx-auto w-full max-w-[592px] overflow-x-clip [--zigzag:0.7] md:[--zigzag:1]">
      <h1 className="sr-only">{pathStrings.pageTitle}</h1>

      <div ref={bannerRef} className="sticky top-(--shell-top) z-20 bg-surface pt-4 md:pt-6">
        <UnitBanner unit={currentUnit} onGuidebook={onGuidebook} />
      </div>

      {path.units.map((unit, unitIdx) => {
        const mirrored = unitIdx % 2 === 1;
        return (
          <section
            key={unit.id}
            ref={(element) => {
              sectionRefs.current[unitIdx] = element;
            }}
            aria-labelledby={`unit-${unit.id}-heading`}
            style={unitColorStyle(unit.color)}
          >
            <h2 id={`unit-${unit.id}-heading`} className="sr-only">
              {pathStrings.unitHeading(unit.position, unit.title)}
            </h2>
            {unitIdx > 0 ? <UnitDivider title={unit.title} /> : null}
            <ol className="flex flex-col items-center pt-12 pb-6">
              {unit.nodes.map((node, index) => {
                const isActive = node.id === path.active_node_id;
                const mascotSide = mascotSideFor(index, mirrored);
                return (
                  <li
                    key={node.id}
                    className="relative flex h-[88px] w-full items-center justify-center"
                    style={isActive ? { marginTop: ACTIVE_NODE_EXTRA_SPACE } : undefined}
                  >
                    <div
                      ref={isActive ? activeRef : undefined}
                      style={{
                        transform: `translateX(calc(${nodeOffset(index, mirrored)}px * var(--zigzag)))`,
                      }}
                    >
                      <NodePopover node={node} color={unit.color} onOpenChest={onOpenChest}>
                        <PathNode node={node} highlight={node.id === highlightNodeId} />
                      </NodePopover>
                    </div>
                    {mascotSide ? (
                      <PathMascot
                        side={mascotSide}
                        pose={MASCOT_POSES[unitIdx % MASCOT_POSES.length]}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {/* Zero-height sticky anchor: the button floats above the bottom edge without taking space. */}
      <div className="pointer-events-none sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 h-0 md:bottom-6">
        {jump ? (
          <div className="absolute right-0 bottom-0">
            <JumpBackButton direction={jump} onClick={jumpToActive} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Tracks which unit sits under the sticky banner and where the active node is relative to the
 * viewport. Measures a handful of rects at most once per frame while scrolling; listening in the
 * capture phase catches scrolls of the window or of any scrolling ancestor.
 */
function usePathScroll(
  bannerRef: RefObject<HTMLElement | null>,
  sectionRefs: RefObject<(HTMLElement | null)[]>,
  activeRef: RefObject<HTMLElement | null>,
) {
  const [unitIndex, setUnitIndex] = useState(0);
  const [jump, setJump] = useState<JumpDirection | null>(null);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const line = bannerRef.current?.getBoundingClientRect().bottom ?? 0;

      let current = 0;
      sectionRefs.current.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top < line) current = index;
      });
      setUnitIndex(current);

      const active = activeRef.current?.getBoundingClientRect();
      if (!active) setJump(null);
      else if (active.bottom < line) setJump("up");
      else if (active.top > window.innerHeight) setJump("down");
      else setJump(null);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    schedule();
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [bannerRef, sectionRefs, activeRef]);

  return { unitIndex, jump };
}

function prefersMotion(): boolean {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !reduced && document.documentElement.dataset.animations !== "off";
}
