import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

/** Blue speaker; a text colour class on `className` recolours it (e.g. white on a blue button). */
export function Speaker(props: IconProps) {
  return (
    <IconBase color={palette.blue} {...props}>
      <path
        d="M3 9.6C3 8.9 3.6 8.3 4.3 8.3H7.4L12 4.5C12.8 3.8 14 4.4 14 5.4V18.6C14 19.6 12.8 20.2 12 19.5L7.4 15.7H4.3C3.6 15.7 3 15.1 3 14.4Z"
        fill="currentColor"
      />
      <path
        d="M16.9 9.1C17.6 9.9 18 10.9 18 12C18 13.1 17.6 14.1 16.9 14.9M19.3 6.6C20.6 8 21.4 9.9 21.4 12C21.4 14.1 20.6 16 19.3 17.4"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </IconBase>
  );
}
