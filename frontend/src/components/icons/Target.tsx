import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export function Target(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx={12} cy={13} r={9.6} fill={palette.greenShade} />
      <circle cx={12} cy={11.9} r={9.6} fill={palette.green} />
      <circle cx={12} cy={11.9} r={6.6} fill={palette.white} />
      <circle cx={12} cy={11.9} r={3.8} fill={palette.green} />
      <circle cx={12} cy={11.9} r={1.4} fill={palette.white} />
    </IconBase>
  );
}
