import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export interface CrownProps extends IconProps {
  /** Paints the whole crown in one colour (e.g. white on a gold legendary node). */
  fill?: string;
}

const BODY = "M4.4 17L3.4 8.2L8.4 12L12 5.6L15.6 12L20.6 8.2L19.6 17Z";
const TIPS = [
  { cx: 3.4, cy: 7.4 },
  { cx: 12, cy: 4.6 },
  { cx: 20.6, cy: 7.4 },
];

export function Crown({ fill, ...props }: CrownProps) {
  const main = fill ?? palette.gold;
  return (
    <IconBase {...props}>
      <path d={BODY} fill={main} stroke={main} strokeWidth={1.8} strokeLinejoin="round" />
      {TIPS.map((tip) => (
        <circle key={tip.cx} {...tip} r={1.7} fill={main} />
      ))}
      {fill ? (
        <rect x={3.6} y={15.6} width={16.8} height={4.2} rx={1.6} fill={fill} />
      ) : (
        <>
          <path
            d="M6.2 10.6L6.7 14.4"
            stroke={palette.white}
            strokeOpacity={0.7}
            strokeWidth={1.3}
            strokeLinecap="round"
          />
          <rect x={3.6} y={16.4} width={16.8} height={4.6} rx={1.6} fill={palette.goldShade} />
          <rect x={3.6} y={15.6} width={16.8} height={4.2} rx={1.6} fill="#FFB700" />
          {[8, 12, 16].map((cx) => (
            <circle key={cx} cx={cx} cy={17.7} r={1} fill={palette.white} opacity={0.75} />
          ))}
        </>
      )}
    </IconBase>
  );
}
