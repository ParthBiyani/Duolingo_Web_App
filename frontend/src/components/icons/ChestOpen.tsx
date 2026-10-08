import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

const SPARKLE = "M0 -1.6Q0.25 -0.25 1.6 0Q0.25 0.25 0 1.6Q-0.25 0.25 -1.6 0Q-0.25 -0.25 0 -1.6Z";

export function ChestOpen(props: IconProps) {
  return (
    <IconBase {...props}>
      {/* open lid, seen from the inside */}
      <path
        d="M3.8 11.4L5.4 4.6H18.6L20.2 11.4Z"
        fill={palette.woodShade}
        stroke={palette.woodShade}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <rect x={4.4} y={3.2} width={15.2} height={2.4} rx={1.2} fill={palette.gold} />
      {/* treasure */}
      <circle cx={7.6} cy={10.6} r={2.4} fill={palette.goldShade} />
      <circle cx={7.6} cy={10.2} r={2.4} fill={palette.gold} />
      <circle cx={16.6} cy={10.8} r={2.2} fill={palette.goldShade} />
      <circle cx={16.6} cy={10.4} r={2.2} fill={palette.gold} />
      <polygon
        points="9.6,9.2 10.9,7.4 13.1,7.4 14.4,9.2 12,12.4"
        fill={palette.blue}
        stroke={palette.blue}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <polygon points="10.9,7.4 13.1,7.4 12.6,9.2 11.4,9.2" fill={palette.blueLighter} />
      <path d={SPARKLE} transform="translate(5.2 6.4)" fill={palette.white} />
      <path d={SPARKLE} transform="translate(18.6 7.2) scale(0.8)" fill={palette.white} />
      {/* body */}
      <rect x={3} y={11.4} width={18} height={10.2} rx={2} fill={palette.woodShade} />
      <rect x={3} y={11.4} width={18} height={9} rx={2} fill={palette.wood} />
      <rect x={3} y={11.4} width={18} height={2.2} rx={1.1} fill={palette.gold} />
      <rect x={9.6} y={13.6} width={4.8} height={4.8} rx={1.3} fill={palette.goldShade} />
      <rect x={9.6} y={13.2} width={4.8} height={4.6} rx={1.3} fill={palette.gold} />
      <circle cx={12} cy={15.2} r={0.9} fill={palette.woodDark} />
    </IconBase>
  );
}
