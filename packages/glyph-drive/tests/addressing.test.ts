import { describe, it, expect } from "vitest";
import { jobIdToBaseFace, encodeAddress, parseAddress } from "@glyph/glyph-drive";

describe("addressing", () => {
  it("hashes job ids deterministically to 0..13", () => {
    const a = jobIdToBaseFace("alpha");
    const b = jobIdToBaseFace("alpha");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(14);
  });

  it("encodes/decodes path", () => {
    const addr = encodeAddress(3, [0,3,1]);
    const p = parseAddress(addr);
    expect(p.face).toBe(3);
    expect(p.path).toEqual([0,3,1]);
  });
});
