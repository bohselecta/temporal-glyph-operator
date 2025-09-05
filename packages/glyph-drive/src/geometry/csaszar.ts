import { safe } from "./util";
import type { Vec3T, TriIndices } from "./types";

export type Vec3 = Vec3T;
export type Tri = TriIndices;

/**
 * Vertex coordinates for a classical Császár embedding in R^3.
 * Labeling: P0..P6.
 * Units: arbitrary; preserve relative positions.
 */
export const CSASZAR_VERTICES: Vec3[] = [
  [0, 0, 15],
  [3, 3, 0],
  [-3, -3, 1],
  [-1, -2, 3],
  [1, 2, 3],
  [3, 3, 1],
  [3, -3, 0],
];

/**
 * 14 faces (triangles) of the Möbius (K7) torus triangulation.
 * Indices are 0-based (1→0, 2→1, ..., 7→6).
 * Faces listed in a stable order so A..N labels map 1:1 to these entries.
 */
export const CSASZAR_FACES: Tri[] = [
  // 124, 235, 346, 457, 561, 672, 713,
  [0, 1, 3],
  [1, 2, 4],
  [2, 3, 5],
  [3, 4, 6],
  [4, 5, 0],
  [5, 6, 1],
  [6, 0, 2],
  // 134, 245, 356, 467, 571, 612, 723
  [0, 2, 3],
  [1, 3, 4],
  [2, 4, 5],
  [3, 5, 6],
  [4, 6, 0],
  [5, 0, 1],
  [6, 1, 2],
];

/**
 * Canonical labels for the 14 base faces. These are the glyph-drive Level-0 labels (A..N).
 * You can change the mapping here if you want a different visual arrangement.
 */
export const FACE_LABELS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N",
] as const;
export type FaceLabel = typeof FACE_LABELS[number];

/** Build complete edge set from faces (should be K7 with 21 unique edges). */
export function buildEdgeSet(faces: Tri[]): Set<string> {
  const s = new Set<string>();
  for (const [a,b,c] of faces) {
    const e = (
      [[a,b],[b,c],[c,a]] as const
    ).map(([i,j]) => i<j ? `${i}-${j}` : `${j}-${i}`);
    e.forEach(k => s.add(k));
  }
  return s;
}

/** Centroid of a triangle face. */
export function faceCentroid(faceIndex: number): Vec3 {
  const f = safe(CSASZAR_FACES, faceIndex);
  const a = safe(CSASZAR_VERTICES, f[0]!);
  const b = safe(CSASZAR_VERTICES, f[1]!);
  const c = safe(CSASZAR_VERTICES, f[2]!);
  return [
    (a[0] + b[0] + c[0]) / 3,
    (a[1] + b[1] + c[1]) / 3,
    (a[2] + b[2] + c[2]) / 3,
  ] as const;
}

/** Normal vector of a triangle face (right-hand rule). */
export function faceNormal(faceIndex: number): Vec3 {
  const f = safe(CSASZAR_FACES, faceIndex);
  const a = safe(CSASZAR_VERTICES, f[0]!);
  const b = safe(CSASZAR_VERTICES, f[1]!);
  const c = safe(CSASZAR_VERTICES, f[2]!);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
  const n = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ] as const;
  const len = Math.hypot(n[0], n[1], n[2]);
  return len > 0 ? [n[0] / len, n[1] / len, n[2] / len] as const : [0, 0, 1] as const;
}

/** Convert face index to label (A..N). */
export function faceIndexToLabel(i: number): FaceLabel {
  return FACE_LABELS[i] ?? "A";
}

/** Convert label (A..N) to face index. */
export function labelToFaceIndex(label: string): number {
  return FACE_LABELS.indexOf(label as FaceLabel);
}

/** Loop-style 4-way triangle split compatible with addressing hierarchy. */
export function loopSubdivide(tri: Tri): Tri[] {
  const a = tri[0]!;
  const b = tri[1]!;
  const c = tri[2]!;
  const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
  return [
    [a, ab, ca] as Tri, // 0
    [ab, b, bc] as Tri, // 1
    [ca, bc, c] as Tri, // 2
    [ab, bc, ca] as Tri // 3 (central)
  ];
}

function mid(a: number, b: number): number {
  return (a + b) / 2;
}

/** Follow address path to get the triangle at a given depth. */
export function triangleAt(addr: import("../addressing/hierarchy").ParsedAddress, base: Tri[]): Tri {
  let tri = base[addr.face];
  if (!tri) throw new Error(`Invalid face index: ${addr.face}`);
  for (const c of addr.path) {
    const subdivided = loopSubdivide(tri);
    tri = subdivided[c]!;
  }
  return tri;
}

export function centroid(tri: Tri): Vec3 {
  const a = tri[0]!;
  const b = tri[1]!;
  const c = tri[2]!;
  return [
    (a[0] + b[0] + c[0]) / 3,
    (a[1] + b[1] + c[1]) / 3,
    (a[2] + b[2] + c[2]) / 3,
  ] as const;
}

// Re-export types for compatibility
export type { ParsedAddress } from "../addressing/hierarchy";

// Build indexed geometry for rendering
export function buildIndexed(levels = 0) {
  let current = CSASZAR_FACES as Tri[];
  
  // Apply subdivision levels
  for (let i = 0; i < levels; i++) {
    const next: Tri[] = [];
    for (const tri of current) {
      next.push(...loopSubdivide(tri));
    }
    current = next;
  }
  
  // Convert triangles to positions and indices
  const positions: number[] = [];
  const indices: number[] = [];
  
  for (let i = 0; i < current.length; i++) {
    const tri = current[i];
    const baseIndex = positions.length / 3;
    
    // Add vertices
    positions.push(tri[0], tri[1], tri[2]);
    positions.push(tri[3], tri[4], tri[5]);
    positions.push(tri[6], tri[7], tri[8]);
    
    // Add triangle indices
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
  }
  
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}
