import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export interface DumbbellProps extends IconProps {
  /** Paints the whole dumbbell in one colour (e.g. white on a path node). */
  fill?: string;
}

const PLATES = [
  { x: 2.6, y: 8.4, width: 3.2, height: 7.2 },
  { x: 5.2, y: 5.8, width: 3.6, height: 12.4 },
  { x: 15.2, y: 5.8, width: 3.6, height: 12.4 },
  { x: 18.2, y: 8.4, width: 3.2, height: 7.2 },
];

export function Dumbbell({ fill, ...props }: DumbbellProps) {
  const plate = fill ?? palette.blue;
  return (
    <IconBase {...props}>
      <rect x={8} y={10.6} width={8} height={2.8} rx={1} fill={fill ?? "#B7B7B7"} />
      {fill
        ? null
        : PLATES.map((p) => (
            <rect key={p.x} {...p} y={p.y + 1} rx={1.4} fill={palette.blueShade} />
          ))}
      {PLATES.map((p) => (
        <rect key={p.x} {...p} rx={1.4} fill={plate} />
      ))}
      {fill ? null : (
        <path
          d="M6.6 8V11.4"
          stroke={palette.white}
          strokeOpacity={0.6}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
      )}
    </IconBase>
  );
}
