import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export interface MedalProps extends IconProps {
  /** 1 gold, 2 silver, 3 bronze. */
  place: 1 | 2 | 3;
}

const METALS = {
  1: { main: palette.gold, shade: palette.goldShade, inner: palette.goldLight, text: "#B97F00" },
  2: { main: "#C6CED6", shade: "#A3AEB8", inner: "#E4E9EE", text: "#7D8A96" },
  3: { main: "#E08A44", shade: "#B9682A", inner: "#F4B27C", text: "#9A5220" },
} as const;

export function Medal({ place: requested, ...props }: MedalProps) {
  const place = requested in METALS ? requested : 1;
  const metal = METALS[place];
  return (
    <IconBase {...props}>
      <path
        d="M5.8 2.4H9.6L13.4 10.2L10.2 11.8Z"
        fill={palette.blue}
        stroke={palette.blue}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <path
        d="M18.2 2.4H14.4L10.6 10.2L13.8 11.8Z"
        fill={palette.blueShade}
        stroke={palette.blueShade}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <circle cx={12} cy={15.6} r={6.2} fill={metal.shade} />
      <circle cx={12} cy={14.8} r={6.2} fill={metal.main} />
      <circle cx={12} cy={14.8} r={4.3} fill={metal.inner} />
      <text
        x={12}
        y={17.3}
        textAnchor="middle"
        fontSize={7}
        fontWeight={800}
        fontFamily="inherit"
        fill={metal.text}
      >
        {place}
      </text>
    </IconBase>
  );
}
