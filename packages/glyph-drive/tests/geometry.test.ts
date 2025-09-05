import { describe, it, expect } from "vitest";
import { CSASZAR_FACES, triangleAt, centroid } from "@glyph/glyph-drive";
import { parseAddress } from "@glyph/glyph-drive";

describe("Császár geometry", () => {
  it("has 14 base faces", () => {
    expect(CSASZAR_FACES.length).toBe(14);
  });
  it("descends into children deterministically", () => {
    const tri0 = triangleAt(parseAddress("A:0" as any), CSASZAR_FACES);
    const tri1 = triangleAt(parseAddress("A:1:c=2" as any), CSASZAR_FACES);
    const tri2 = triangleAt(parseAddress("A:2:c=2:c=1" as any), CSASZAR_FACES);
    expect(centroid(tri0)).not.toEqual(centroid(tri1));
    expect(centroid(tri1)).not.toEqual(centroid(tri2));
  });
});
