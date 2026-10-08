import { Mascot, type MascotPose } from "@/components/mascot";

import type { MascotSide } from "./layout";

const MASCOT_SIZE = 112;
/** Half the mascot plus a little air, so it never pokes out of a narrow column. */
const EDGE_ALLOWANCE = MASCOT_SIZE / 2 + 8;

/**
 * Decorative mascot standing in the empty space beside a swing of the path. Its distance from
 * the centre is capped by the column width so it fits from phone to desktop.
 */
export function PathMascot({ side, pose }: { side: MascotSide; pose: MascotPose }) {
  const distance = `min(150px, 50% - ${EDGE_ALLOWANCE}px)`;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: side === "right" ? `calc(50% + ${distance})` : `calc(50% - ${distance})` }}
    >
      <Mascot pose={pose} size={MASCOT_SIZE} />
    </div>
  );
}
