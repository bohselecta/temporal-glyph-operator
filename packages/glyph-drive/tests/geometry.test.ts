import { describe, it, expect } from "vitest";
import { baseFaces14, triangleAt, centroid } from "@glyph/glyph-drive";
import { parseAddress } from "@glyph/glyph-drive";

describe("torus14 geometry", () => {
  it("has 14 base faces", () => {
    const faces = baseFaces14();
    expect(faces.length).toBe(14);
  });
  it("descends into children deterministically", () => {
    const faces = baseFaces14();
    const tri0 = triangleAt(parseAddress("A:0" as any), faces);
    const tri1 = triangleAt(parseAddress("A:1:c=2" as any), faces);
    const tri2 = triangleAt(parseAddress("A:2:c=2:c=1" as any), faces);
    expect(centroid(tri0)).not.toEqual(centroid(tri1));
    expect(centroid(tri1)).not.toEqual(centroid(tri2));
  });
});
