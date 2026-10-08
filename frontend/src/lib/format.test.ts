import { describe, expect, it } from "vitest";

import { formatCount } from "./format";

describe("formatCount", () => {
  it("adds thousands separators", () => {
    expect(formatCount(1240)).toBe("1,240");
  });
});
