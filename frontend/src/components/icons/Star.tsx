import { IconBase, type IconProps } from "./IconBase";
import { palette } from "./palette";

export interface StarProps extends IconProps {
  /** Star colour. White by default (for coloured path nodes). */
  fill?: string;
}

const STAR =
  "M12 3L14.59 9.04L21.13 9.63L16.18 13.96L17.64 20.37L12 17L6.36 20.37L7.82 13.96L2.87 9.63L9.41 9.04Z";

export function Star({ fill = palette.white, ...props }: StarProps) {
  return (
    <IconBase {...props}>
      <path d={STAR} fill={fill} stroke={fill} strokeWidth={2.2} strokeLinejoin="round" />
    </IconBase>
  );
}
