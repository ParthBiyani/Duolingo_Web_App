import { IconBase, type IconProps } from "./IconBase";

/** Bold check mark painted in the current text colour. */
export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 12.6L9.8 17.4L19 7.4"
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
