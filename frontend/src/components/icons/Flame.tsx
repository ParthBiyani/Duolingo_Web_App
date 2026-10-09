import { DuoImage } from "./DuoImage";
import type { IconProps } from "./IconBase";

export interface FlameProps extends IconProps {
  /** Grey look used before today's streak is extended. */
  muted?: boolean;
}

export function Flame({ muted = false, ...props }: FlameProps) {
  return <DuoImage name={muted ? "streak-off" : "streak"} {...props} />;
}
