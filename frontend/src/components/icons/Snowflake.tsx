import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

// Six arms, each with a V-shaped branch (precomputed so server and client output match).
const FLAKE =
  "M12 12L12 3.4M10.09 5.09L12 7L13.91 5.09M12 12L19.45 7.7M17.03 6.89L16.33 9.5L18.94 10.2M12 12L19.45 16.3M18.94 13.8L16.33 14.5L17.03 17.11M12 12L12 20.6M13.91 18.91L12 17L10.09 18.91M12 12L4.55 16.3M6.97 17.11L7.67 14.5L5.06 13.8M12 12L4.55 7.7M5.06 10.2L7.67 9.5L6.97 6.89";

export function Snowflake(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d={FLAKE}
        transform="translate(0 0.9)"
        stroke={palette.blueShade}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={FLAKE}
        stroke={palette.blue}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
