import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export function Clock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx={12} cy={13.1} r={9.4} fill={palette.orangeShade} />
      <circle cx={12} cy={12} r={9.4} fill={palette.orange} />
      <path
        d="M12 6.8V12L15.4 14.2"
        stroke={palette.white}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
