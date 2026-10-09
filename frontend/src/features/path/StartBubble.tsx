import { cn, PanelArrow } from "@/components/ui";

/**
 * The "START" speech bubble that bobs above the node the learner should press next. It is
 * decorative (the node button carries the accessible label) and ignores the pointer.
 */
export function StartBubble({ label, className }: { label: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2",
        className,
      )}
    >
      <div className="animate-bob">
        <div className="relative rounded-bubble border-2 border-border bg-surface px-3.5 py-[12px] text-[17px] leading-[17px] font-bold tracking-[0.51px] whitespace-nowrap text-(--unit-face) uppercase">
          {label}
          {/* The arrow's base starts 2px above its box, covering the bubble's bottom border. */}
          <PanelArrow
            width={20}
            height={9}
            className="absolute top-[calc(100%+2px)] left-1/2 -translate-x-1/2"
          />
        </div>
      </div>
    </div>
  );
}
