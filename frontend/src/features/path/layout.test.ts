import { describe, expect, it } from "vitest";

import { mascotSideFor, nodeOffset, PATH_OFFSETS } from "./layout";

describe("nodeOffset", () => {
  it("follows the measured zig-zag and repeats every 8 nodes", () => {
    const offsets = Array.from({ length: 10 }, (_, index) => nodeOffset(index, false));
    expect(offsets).toEqual([...PATH_OFFSETS, 0, -45]);
  });

  it("mirrors the swing for alternate units without producing -0", () => {
    expect(nodeOffset(2, true)).toBe(70);
    expect(nodeOffset(6, true)).toBe(-70);
    expect(Object.is(nodeOffset(0, true), 0)).toBe(true);
  });
});

describe("mascotSideFor", () => {
  it("places a mascot opposite the deepest point of each swing", () => {
    expect(mascotSideFor(2, false)).toBe("right");
    expect(mascotSideFor(6, false)).toBe("left");
    expect(mascotSideFor(2, true)).toBe("left");
  });

  it("leaves the other nodes without a mascot", () => {
    expect([0, 1, 3, 4, 5, 7].map((index) => mascotSideFor(index, false))).toEqual(
      Array(6).fill(null),
    );
  });
});
