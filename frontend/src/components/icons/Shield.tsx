import { IconBase, type IconProps } from "./IconBase";
import { darken, lighten, palette } from "./palette";

export interface ShieldProps extends IconProps {
  /** Badge colour, e.g. a league tier colour. Hex values also get matching shades. */
  color?: string;
}

const SHIELD =
  "M12 2.2C14.6 3.6 17.2 4.3 19.9 4.5C20.3 4.5 20.6 4.9 20.6 5.3C20.5 12.4 17.9 17.6 12.6 20.9C12.2 21.1 11.8 21.1 11.4 20.9C6.1 17.6 3.5 12.4 3.4 5.3C3.4 4.9 3.7 4.5 4.1 4.5C6.8 4.3 9.4 3.6 12 2.2Z";
const LEFT_HALF =
  "M12 2.2C9.4 3.6 6.8 4.3 4.1 4.5C3.7 4.5 3.4 4.9 3.4 5.3C3.5 12.4 6.1 17.6 11.4 20.9C11.6 21 11.8 21.05 12 21.05Z";
const STAR =
  "M12 7.4L13.25 10.05L16.1 10.4L14 12.35L14.55 15.2L12 13.8L9.45 15.2L10 12.35L7.9 10.4L10.75 10.05Z";

export function Shield({ color = palette.gold, ...props }: ShieldProps) {
  return (
    <IconBase {...props}>
      <path d={SHIELD} transform="translate(0 1.2)" fill={darken(color, 0.2)} />
      <path d={SHIELD} fill={color} />
      <path d={LEFT_HALF} fill={lighten(color, 0.28)} />
      <path
        d={STAR}
        fill={palette.white}
        stroke={palette.white}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
