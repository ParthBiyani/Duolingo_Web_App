"use client";

import type { IconProps } from "@/components/icons";
import { useMe } from "@/lib/api";

/** The profile tab's icon: the learner's initial in a dashed circle, as for a learner without a photo. */
export function ProfileNavIcon({ size = 32, className }: IconProps) {
  const { data: me } = useMe();
  const initial = me?.user.display_name.trim().charAt(0).toUpperCase() ?? "";
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.46 }}
      className={`grid shrink-0 place-items-center rounded-full border-[1.6px] border-dashed border-disabled font-bold text-disabled ${className ?? ""}`}
    >
      {initial}
    </span>
  );
}
