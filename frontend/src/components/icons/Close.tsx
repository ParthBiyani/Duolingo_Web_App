import { IconBase, type IconProps } from "./IconBase";

/** Grey X; a text colour class on `className` recolours it. */
export function Close(props: IconProps) {
  return (
    <IconBase color="#AFAFAF" {...props}>
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
      />
    </IconBase>
  );
}
