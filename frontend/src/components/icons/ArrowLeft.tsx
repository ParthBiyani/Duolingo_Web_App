import { IconBase, type IconProps } from "./IconBase";

/** Back arrow painted in the current text colour. */
export function ArrowLeft(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M19 12H5.6M11.4 5.8L5.2 12L11.4 18.2"
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
