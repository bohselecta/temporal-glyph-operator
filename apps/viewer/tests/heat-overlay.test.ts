import { describe, it, expect } from "vitest";
import { ramp } from "@glyph/viewer/src/overlay/HeatOverlay";

describe("ramp", () => {
  it("monotone brightness", () => {
    const a = ramp(0), b = ramp(5), c = ramp(10);
    const L = (x:[number,number,number]) => x[0]*0.2126 + x[1]*0.7152 + x[2]*0.0722;
    expect(L(a)).toBeLessThan(L(b));
    expect(L(b)).toBeLessThan(L(c));
  });
});
