import { HEART_PATH } from "./Heart";
import { IconBase, type IconProps } from "./IconBase";
import { greys } from "./palette";

export function HeartEmpty(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={HEART_PATH} transform="translate(0 1.3)" style={{ fill: greys.edge }} />
      <path d={HEART_PATH} style={{ fill: greys.face }} />
    </IconBase>
  );
}
