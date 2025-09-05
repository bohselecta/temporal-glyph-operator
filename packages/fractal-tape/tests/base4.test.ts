import { describe, it, expect } from "vitest";
import { bytesToBase4, base4ToBytes } from "../src/base4";

describe("base4", () => {
  it("bytes ↔ base4 roundtrip", () => {
    const src = new Uint8Array([0,1,2,3,250,251,252,253,254,255]);
    const d = bytesToBase4(src);
    const out = base4ToBytes(d);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it("handles empty array", () => {
    const src = new Uint8Array([]);
    const d = bytesToBase4(src);
    const out = base4ToBytes(d);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it("handles single byte", () => {
    const src = new Uint8Array([42]);
    const d = bytesToBase4(src);
    const out = base4ToBytes(d);
    expect(Array.from(out)).toEqual(Array.from(src));
  });

  it("produces valid base-4 digits", () => {
    const src = new Uint8Array([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    const d = bytesToBase4(src);
    expect(d).toMatch(/^[0-3]+$/);
  });
});
