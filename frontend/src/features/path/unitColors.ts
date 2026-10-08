import type { CSSProperties } from "react";

import type { UnitColor } from "@/lib/api/types";

/**
 * Each unit is painted in one colour family. Instead of threading colours through props, a unit
 * subtree gets two custom properties, `--unit-face` and `--unit-shade`, that its banner, nodes,
 * ring and popover read. Values point at the design tokens, so nothing here is a raw colour.
 */
const UNIT_TOKENS: Record<UnitColor, { face: string; shade: string }> = {
  green: { face: "var(--unit-green)", shade: "var(--unit-green-shade)" },
  purple: { face: "var(--unit-purple)", shade: "var(--unit-purple-shade)" },
  blue: { face: "var(--unit-blue)", shade: "var(--unit-blue-shade)" },
  orange: { face: "var(--unit-orange)", shade: "var(--unit-orange-shade)" },
  red: { face: "var(--unit-red)", shade: "var(--unit-red-shade)" },
};

export function unitColorStyle(color: UnitColor): CSSProperties {
  const tokens = UNIT_TOKENS[color] ?? UNIT_TOKENS.green;
  return { "--unit-face": tokens.face, "--unit-shade": tokens.shade } as CSSProperties;
}
