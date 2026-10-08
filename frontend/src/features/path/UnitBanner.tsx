import { ArrowLeft, Book } from "@/components/icons";
import type { PathUnit } from "@/lib/api/types";

import { pathStrings } from "./strings";
import { unitColorStyle } from "./unitColors";

interface UnitBannerProps {
  unit: PathUnit;
  onGuidebook: () => void;
}

/**
 * Header card for the unit currently on screen. The learn page keeps one of these sticky at the
 * top and swaps its unit as the learner scrolls; the colour change animates.
 */
export function UnitBanner({ unit, onGuidebook }: UnitBannerProps) {
  return (
    <div
      style={unitColorStyle(unit.color)}
      className="flex min-h-[88px] items-center justify-between gap-3 rounded-banner bg-(--unit-face) py-3 pr-3 pl-4 text-white transition-colors duration-300 md:pr-4"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-caps uppercase opacity-80 md:text-button">
          <ArrowLeft size={18} />
          {pathStrings.sectionUnit(unit.section, unit.position)}
        </p>
        <p className="mt-1 text-xl leading-7 font-bold md:text-[22px]">{unit.title}</p>
      </div>
      <button
        type="button"
        onClick={onGuidebook}
        aria-label={pathStrings.guidebook}
        className="flex shrink-0 items-center gap-2 rounded-button border-2 border-(--unit-shade) px-3 py-2.5 text-button uppercase shadow-[0_2px_0_var(--unit-shade)] transition-[translate,box-shadow,background-color] duration-100 hover:bg-white/10 focus-visible:outline-white active:translate-y-0.5 active:shadow-none md:px-4"
      >
        <Book size={24} />
        <span className="max-md:hidden">{pathStrings.guidebook}</span>
      </button>
    </div>
  );
}
