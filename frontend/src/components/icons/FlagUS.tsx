import { useId } from "react";

import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

const TOP = 4.4;
const HEIGHT = 15;
const STRIPE = HEIGHT / 7;
const NAVY = "#3A63D3";
const STARS = [3.3, 6.25, 9.2].flatMap((cx) => [6.3, 8.6, 10.9].map((cy) => ({ cx, cy })));

/** Simplified US flag: seven stripes and a canton with a grid of stars. */
export function FlagUS(props: IconProps) {
  const clipId = `flag-us-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <IconBase {...props}>
      <defs>
        <clipPath id={clipId}>
          <rect x={1} y={TOP} width={22} height={HEIGHT} rx={3} />
        </clipPath>
      </defs>
      <rect x={1} y={TOP + 1.2} width={22} height={HEIGHT} rx={3} fill="#C92A2A" />
      <g clipPath={`url(#${clipId})`}>
        <rect x={1} y={TOP} width={22} height={HEIGHT} fill={palette.white} />
        {[0, 2, 4, 6].map((i) => (
          <rect key={i} x={1} y={TOP + i * STRIPE} width={22} height={STRIPE} fill={palette.red} />
        ))}
        <rect x={1} y={TOP} width={10.6} height={STRIPE * 4} fill={NAVY} />
        {STARS.map(({ cx, cy }) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={0.62} fill={palette.white} />
        ))}
      </g>
    </IconBase>
  );
}
