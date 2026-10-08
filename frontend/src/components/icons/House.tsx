import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

const ROOF = "M3.6 11.4L12 4.2L20.4 11.4";

export function House(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x={15.4} y={4.4} width={2.8} height={5} rx={0.8} fill={palette.redShade} />
      <rect x={5} y={10.4} width={14} height={11.2} rx={1.8} fill={palette.beigeShade} />
      <rect x={5} y={9.4} width={14} height={11} rx={1.8} fill={palette.beige} />
      <path d="M9.8 20.4V15.8A2.2 2.2 0 0 1 14.2 15.8V20.4Z" fill={palette.wood} />
      <path d="M9.8 20.4H14.2V21.6H9.8Z" fill={palette.woodShade} />
      <circle cx={13.1} cy={17.6} r={0.55} fill={palette.woodDark} />
      <path
        d={ROOF}
        transform="translate(0 1.2)"
        stroke={palette.redShade}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={ROOF}
        stroke={palette.red}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
