import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

/** Simplified Spanish flag: red, yellow (double height), red. */
export function FlagES(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x={1} y={5.6} width={22} height={15} rx={3} fill="#C92A2A" />
      <rect x={1} y={4.4} width={22} height={15} rx={3} fill={palette.red} />
      <rect x={1} y={8.15} width={22} height={7.5} fill={palette.gold} />
      <rect
        x={5}
        y={10.1}
        width={2.6}
        height={3.6}
        rx={0.9}
        fill={palette.redShade}
        opacity={0.55}
      />
    </IconBase>
  );
}
