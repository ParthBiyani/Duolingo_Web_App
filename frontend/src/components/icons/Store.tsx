import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

// Five awning stripes (red, white, red, white, red) with scalloped ends.
const STRIPES = [0, 1, 2, 3, 4].map((i) => {
  const x = 3 + i * 3.6;
  return {
    d: `M${x} 5H${x + 3.6}V9.2A1.8 1.8 0 0 1 ${x} 9.2Z`,
    fill: i % 2 === 0 ? palette.red : palette.white,
  };
});

export function Store(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x={4.4} y={8.8} width={15.2} height={12.8} rx={1.6} fill={palette.beigeShade} />
      <rect x={4.4} y={8.6} width={15.2} height={11.8} rx={1.6} fill={palette.beige} />
      <rect x={6.4} y={13} width={4.8} height={4.2} rx={0.9} fill={palette.blueLight} />
      <path
        d="M13.2 20.4V13.9A0.9 0.9 0 0 1 14.1 13H16.7A0.9 0.9 0 0 1 17.6 13.9V20.4Z"
        fill={palette.wood}
      />
      <rect x={13.2} y={20.4} width={4.4} height={1.2} fill={palette.woodShade} />
      {STRIPES.map(({ d, fill }) => (
        <path key={d} d={d} fill={fill} />
      ))}
      <path d="M3 9.2A1.8 1.8 0 0 0 6.6 9.2V9.9A1.8 1.8 0 0 1 3 9.9Z" fill={palette.redShade} />
      <path
        d="M10.2 9.2A1.8 1.8 0 0 0 13.8 9.2V9.9A1.8 1.8 0 0 1 10.2 9.9Z"
        fill={palette.redShade}
      />
      <path
        d="M17.4 9.2A1.8 1.8 0 0 0 21 9.2V9.9A1.8 1.8 0 0 1 17.4 9.9Z"
        fill={palette.redShade}
      />
      <rect x={2.4} y={2.6} width={19.2} height={3.2} rx={1.6} fill={palette.red} />
    </IconBase>
  );
}
