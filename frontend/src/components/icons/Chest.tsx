import { IconBase, type IconProps } from "./IconBase";
import { greys, palette } from "./palette";

export interface ChestProps extends IconProps {
  /** Grey look for a chest that is still locked. */
  muted?: boolean;
}

const COLOURS = {
  shade: { fill: palette.woodShade },
  body: { fill: palette.wood },
  lid: { fill: palette.woodLight },
  band: { fill: palette.gold },
  bandShade: { fill: palette.goldShade },
  keyhole: { fill: palette.woodDark },
};

// Same roles as a locked path node: face on top, edge underneath, icon grey for details.
const MUTED = {
  shade: { style: { fill: greys.edge } },
  body: { style: { fill: greys.face } },
  lid: { style: { fill: greys.face } },
  band: { style: { fill: greys.icon } },
  bandShade: { style: { fill: greys.icon } },
  keyhole: { style: { fill: greys.face } },
};

export function Chest({ muted = false, ...props }: ChestProps) {
  const c = muted ? MUTED : COLOURS;
  return (
    <IconBase {...props}>
      <rect x={3} y={11} width={18} height={10.8} rx={2} {...c.shade} />
      <rect x={3} y={11} width={18} height={9.6} rx={2} {...c.body} />
      {muted ? (
        <rect x={3} y={11} width={18} height={9.6} rx={2} fill="#000000" opacity={0.06} />
      ) : null}
      <path d="M3 11.6V8A5 5 0 0 1 8 3H16A5 5 0 0 1 21 8V11.6Z" {...c.lid} />
      <rect x={5.2} y={4.9} width={13.6} height={1.6} rx={0.8} fill={palette.white} opacity={0.3} />
      <rect x={3} y={10.2} width={18} height={2.4} {...c.band} />
      <rect x={3} y={12.6} width={18} height={0.8} {...c.bandShade} />
      <rect x={9.5} y={9.2} width={5} height={6.4} rx={1.4} {...c.bandShade} />
      <rect x={9.5} y={8.6} width={5} height={6} rx={1.4} {...c.band} />
      <circle cx={12} cy={11} r={1} {...c.keyhole} />
      <rect x={11.5} y={11} width={1} height={2.2} rx={0.5} {...c.keyhole} />
    </IconBase>
  );
}
