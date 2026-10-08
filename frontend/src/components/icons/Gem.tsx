import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

// Facets of a cut gem: crown (top) and pavilion (bottom), each with rounded corners.
const FACETS: { points: string; fill: string }[] = [
  { points: "2.4,9.4 6.6,3.8 8.8,9.4", fill: palette.blueLight },
  { points: "6.6,3.8 17.4,3.8 15.2,9.4 8.8,9.4", fill: palette.blueLighter },
  { points: "17.4,3.8 21.6,9.4 15.2,9.4", fill: palette.blue },
  { points: "2.4,9.4 8.8,9.4 12,20.8", fill: "#4FC4FA" },
  { points: "8.8,9.4 15.2,9.4 12,20.8", fill: palette.blue },
  { points: "15.2,9.4 21.6,9.4 12,20.8", fill: palette.blueShade },
];

export function Gem(props: IconProps) {
  return (
    <IconBase {...props}>
      {FACETS.map(({ points, fill }) => (
        <polygon
          key={points}
          points={points}
          fill={fill}
          stroke={fill}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      ))}
      <path d="M9.4 5.6H11.6" stroke={palette.white} strokeWidth={1.3} strokeLinecap="round" />
    </IconBase>
  );
}
