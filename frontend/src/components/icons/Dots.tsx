import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export function Dots(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx={12} cy={12.7} r={9.6} fill={palette.purpleShade} />
      <circle cx={12} cy={11.5} r={9.6} fill={palette.purple} />
      {[7.5, 12, 16.5].map((cx) => (
        <circle key={cx} cx={cx} cy={11.5} r={1.75} fill={palette.white} />
      ))}
    </IconBase>
  );
}
