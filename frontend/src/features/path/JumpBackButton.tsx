import { ArrowLeft } from "@/components/icons";

import { pathStrings } from "./strings";

export type JumpDirection = "up" | "down";

/** Floating button that scrolls back to the active node when it is off screen. */
export function JumpBackButton({
  direction,
  onClick,
}: {
  direction: JumpDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "up" ? pathStrings.jumpUp : pathStrings.jumpDown}
      className="pointer-events-auto grid size-14 place-items-center rounded-button border-2 border-border bg-surface text-blue shadow-edge-border transition-[translate,box-shadow] duration-100 hover:bg-surface-hover active:translate-y-0.5 active:shadow-none"
    >
      <ArrowLeft size={28} className={direction === "up" ? "rotate-90" : "-rotate-90"} />
    </button>
  );
}
