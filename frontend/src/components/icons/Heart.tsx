import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

/** Heart outline shared with HeartEmpty. */
export const HEART_PATH =
  "M12 5.6C10.9 4 9.3 3 7.4 3C4.5 3 2.3 5.3 2.3 8.3C2.3 13.2 7.6 17.4 10.6 19.6C11.4 20.2 12.6 20.2 13.4 19.6C16.4 17.4 21.7 13.2 21.7 8.3C21.7 5.3 19.5 3 16.6 3C14.7 3 13.1 4 12 5.6Z";

export function Heart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={HEART_PATH} transform="translate(0 1.3)" fill={palette.redShade} />
      <path d={HEART_PATH} fill={palette.red} />
      <path
        d="M5.4 8.4C5.4 7.1 6.3 6 7.6 5.9"
        stroke={palette.white}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </IconBase>
  );
}
