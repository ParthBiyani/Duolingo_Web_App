import { DuoImage } from "./DuoImage";
import type { IconProps } from "./IconBase";

export function Logo(props: IconProps) {
  return <DuoImage name="logo" {...props} />;
}
