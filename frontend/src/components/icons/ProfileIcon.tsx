import { IconBase, type IconProps } from "./IconBase";
import { greys } from "./palette";

/** Empty-avatar placeholder: a dashed ring around a simple person. */
export function ProfileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle
        cx={12}
        cy={12}
        r={9.9}
        strokeWidth={1.8}
        strokeDasharray="2.6 2.2"
        strokeLinecap="round"
        style={{ stroke: greys.icon }}
      />
      <circle cx={12} cy={9.6} r={3.1} style={{ fill: greys.icon }} />
      <path
        d="M6.9 17.4C7.6 15 9.6 13.6 12 13.6C14.4 13.6 16.4 15 17.1 17.4C17.3 18 16.9 18.6 16.2 18.6H7.8C7.1 18.6 6.7 18 6.9 17.4Z"
        style={{ fill: greys.icon }}
      />
    </IconBase>
  );
}
