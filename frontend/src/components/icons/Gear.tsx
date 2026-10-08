import { IconBase, type IconProps } from "./IconBase";

const TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

/** Settings gear painted in the current text colour. */
export function Gear(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx={12} cy={12} r={5.4} stroke="currentColor" strokeWidth={3.6} />
      {TEETH.map((angle) => (
        <rect
          key={angle}
          x={10.3}
          y={2.2}
          width={3.4}
          height={4.4}
          rx={1}
          fill="currentColor"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </IconBase>
  );
}
