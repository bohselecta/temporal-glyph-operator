import { describe, it, expect } from "vitest";
import { 
  CSASZAR_VERTICES, 
  CSASZAR_FACES, 
  buildEdgeSet, 
  faceCentroid, 
  faceNormal,
  faceIndexToLabel,
  labelToFaceIndex,
  loopSubdivide,
  triangleAt,
  centroid
} from "@glyph/glyph-drive";
import { parseAddress } from "@glyph/glyph-drive";

describe("Császár polyhedron", () => {
  it("has correct vertex count (7)", () => {
    expect(CSASZAR_VERTICES.length).toBe(7);
  });

  it("has correct face count (14)", () => {
    expect(CSASZAR_FACES.length).toBe(14);
  });

  it("has correct edge count (21) for K7", () => {
    const edges = buildEdgeSet(CSASZAR_FACES);
    expect(edges.size).toBe(21);
  });

  it("satisfies Euler characteristic χ = V - E + F = 0 (torus)", () => {
    const V = CSASZAR_VERTICES.length;
    const F = CSASZAR_FACES.length;
    const E = buildEdgeSet(CSASZAR_FACES).size;
    const chi = V - E + F;
    expect(chi).toBe(0);
  });

  it("has finite centroids", () => {
    for (let i = 0; i < CSASZAR_FACES.length; i++) {
      const c = faceCentroid(i);
      expect(Number.isFinite(c[0])).toBe(true);
      expect(Number.isFinite(c[1])).toBe(true);
      expect(Number.isFinite(c[2])).toBe(true);
    }
  });

  it("has unit normals", () => {
    for (let i = 0; i < CSASZAR_FACES.length; i++) {
      const n = faceNormal(i);
      const len = Math.hypot(n[0], n[1], n[2]);
      expect(Math.abs(len - 1)).toBeLessThan(1e-10);
    }
  });

  it("maps face indices to labels correctly", () => {
    expect(faceIndexToLabel(0)).toBe("A");
    expect(faceIndexToLabel(13)).toBe("N");
    expect(labelToFaceIndex("A")).toBe(0);
    expect(labelToFaceIndex("N")).toBe(13);
  });

  it("subdivides triangles correctly", () => {
    const tri: [number, number, number] = [0, 1, 2];
    const subdivided = loopSubdivide(tri);
    expect(subdivided.length).toBe(4);
    // Check that all vertices are valid indices
    for (const subTri of subdivided) {
      for (const idx of subTri) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(7);
      }
    }
  });

  it("descends into children deterministically", () => {
    const tri0 = triangleAt(parseAddress("A:0" as any), CSASZAR_FACES);
    const tri1 = triangleAt(parseAddress("A:1:c=2" as any), CSASZAR_FACES);
    const tri2 = triangleAt(parseAddress("A:2:c=2:c=1" as any), CSASZAR_FACES);
    expect(centroid(tri0)).not.toEqual(centroid(tri1));
    expect(centroid(tri1)).not.toEqual(centroid(tri2));
  });
});
