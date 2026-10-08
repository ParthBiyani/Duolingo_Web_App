import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export interface TrophyProps extends IconProps {
  /** Paints the whole trophy in one colour (e.g. white on a path node). */
  fill?: string;
}

const CUP = "M6.4 3.4H17.6V8.6C17.6 11.9 15.1 14.4 12 14.4C8.9 14.4 6.4 11.9 6.4 8.6Z";
const HANDLES =
  "M6.6 5.6H5.2C4 5.6 3.2 6.6 3.5 7.8C3.9 9.6 5.2 10.9 7.1 11.2M17.4 5.6H18.8C20 5.6 20.8 6.6 20.5 7.8C20.1 9.6 18.8 10.9 16.9 11.2";

export function Trophy({ fill, ...props }: TrophyProps) {
  const main = fill ?? palette.gold;
  const shade = fill ?? palette.goldShade;
  return (
    <IconBase {...props}>
      <path d={HANDLES} stroke={shade} strokeWidth={1.9} strokeLinecap="round" />
      <path d={CUP} fill={main} stroke={main} strokeWidth={1.2} strokeLinejoin="round" />
      <rect x={10.7} y={13.4} width={2.6} height={4} fill={shade} />
      {fill ? null : (
        <rect x={7.4} y={17.4} width={9.2} height={4} rx={1.3} fill={palette.goldShade} />
      )}
      <rect x={7.4} y={16.6} width={9.2} height={3.8} rx={1.3} fill={main} />
      {fill ? null : (
        <path
          d="M9.2 5.6V8.6C9.2 9.6 9.5 10.4 10.1 11.1"
          stroke={palette.white}
          strokeOpacity={0.7}
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      )}
    </IconBase>
  );
}
