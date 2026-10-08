import { IconBase, type IconProps } from "./IconBase";
import { greys, palette } from "./palette";

export interface FlameProps extends IconProps {
  /** Grey look used before today's streak is extended. */
  muted?: boolean;
}

const OUTER =
  "M12.3 1.5C13.3 4.3 15.5 5.6 17.1 7.8C18.6 9.8 19.4 12 19.3 14.3C19.1 18.2 16 20.8 12 20.8C8 20.8 4.8 18 4.7 14C4.6 11.6 5.6 9.6 7.2 8C7.4 9.6 8.1 10.8 9.2 11.5C8.9 7.7 10.2 4.2 12.3 1.5Z";
const INNER =
  "M12 9.8C13.4 11.5 15.4 13 15.4 15.6C15.4 17.7 13.9 19.3 12 19.3C10.1 19.3 8.6 17.7 8.6 15.6C8.6 13 10.6 11.5 12 9.8Z";

export function Flame({ muted = false, ...props }: FlameProps) {
  if (muted) {
    return (
      <IconBase {...props}>
        <path d={OUTER} transform="translate(0 1.2)" style={{ fill: greys.edge }} />
        <path d={OUTER} style={{ fill: greys.face }} />
        <path d={INNER} style={{ fill: greys.edge }} />
      </IconBase>
    );
  }
  return (
    <IconBase {...props}>
      <path d={OUTER} transform="translate(0 1.2)" fill={palette.orangeShade} />
      <path d={OUTER} fill={palette.orange} />
      <path d={INNER} fill={palette.gold} />
      <path
        d="M11.1 13.9C11.5 13.2 12 12.7 12.4 12.3"
        stroke={palette.white}
        strokeOpacity={0.7}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </IconBase>
  );
}
