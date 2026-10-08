import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

/** Blue microphone; a text colour class on `className` recolours it. */
export function Mic(props: IconProps) {
  return (
    <IconBase color={palette.blue} {...props}>
      <rect x={8.4} y={2.4} width={7.2} height={12.2} rx={3.6} fill="currentColor" />
      <path
        d="M5.6 11.2C5.6 14.8 8.5 17.6 12 17.6C15.5 17.6 18.4 14.8 18.4 11.2M12 17.6V20.6M8.8 20.8H15.2"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </IconBase>
  );
}
