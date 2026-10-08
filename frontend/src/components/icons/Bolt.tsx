import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

const BOLT = "M14.2 2.4L5.4 13.2H11.2L9.8 21.4L18.6 10.6H12.8Z";

export function Bolt(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d={BOLT}
        transform="translate(0 1.1)"
        fill={palette.goldShade}
        stroke={palette.goldShade}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d={BOLT}
        fill={palette.gold}
        stroke={palette.gold}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M12.4 6.2L9.3 10.3"
        stroke={palette.white}
        strokeOpacity={0.75}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </IconBase>
  );
}
