/**
 * Geometry of the learning path. Pure functions so the zig-zag can be unit-tested
 * without rendering anything.
 */

/** Horizontal shift of each node from the column centre (px), repeating every 8 nodes. */
export const PATH_OFFSETS = [0, -45, -70, -45, 0, 45, 70, 45] as const;

/** Vertical distance between two node centres (px). */
export const NODE_PITCH = 88;

/** Extra room above the active node so its START bubble never covers the node above it. */
export const ACTIVE_NODE_EXTRA_SPACE = 48;

/** Offset at which a node sits at the outermost point of a swing; a mascot fills the gap opposite. */
const DEEPEST_SWING = Math.max(...PATH_OFFSETS);

/**
 * Horizontal offset of the node at `indexInUnit`. Every other unit is mirrored so consecutive
 * units swing in opposite directions and their mascots alternate sides.
 */
export function nodeOffset(indexInUnit: number, mirrored: boolean): number {
  const offset = PATH_OFFSETS[indexInUnit % PATH_OFFSETS.length];
  return mirrored && offset !== 0 ? -offset : offset;
}

export type MascotSide = "left" | "right";

/**
 * Side on which a mascot stands next to this node, or null when the node is not at the
 * deepest point of a swing. The mascot always goes opposite the swing, into the empty space.
 */
export function mascotSideFor(indexInUnit: number, mirrored: boolean): MascotSide | null {
  const offset = nodeOffset(indexInUnit, mirrored);
  if (Math.abs(offset) !== DEEPEST_SWING) return null;
  return offset < 0 ? "right" : "left";
}
