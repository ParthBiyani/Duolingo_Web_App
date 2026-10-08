import { IconBase, type IconProps } from "./IconBase";
import { greys } from "./palette";

export function Lock(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M8 10.8V7.9C8 5.7 9.8 3.9 12 3.9C14.2 3.9 16 5.7 16 7.9V10.8"
        strokeWidth={2.6}
        strokeLinecap="round"
        style={{ stroke: greys.icon }}
      />
      <rect x={4.8} y={10} width={14.4} height={11.4} rx={2.6} style={{ fill: greys.icon }} />
      <rect x={4.8} y={10} width={14.4} height={11.4} rx={2.6} fill="#000000" opacity={0.12} />
      <rect x={4.8} y={10} width={14.4} height={10.2} rx={2.6} style={{ fill: greys.icon }} />
      <circle cx={12} cy={14.3} r={1.6} style={{ fill: greys.face }} />
      <rect x={11.25} y={14.6} width={1.5} height={2.8} rx={0.75} style={{ fill: greys.face }} />
    </IconBase>
  );
}
