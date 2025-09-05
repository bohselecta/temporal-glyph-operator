import { safe } from "./util";
import type { Vec3T, TriIndices } from "./types";

export type Vec3 = Vec3T;
export type Tri = TriIndices;

// Császár polyhedron vertices (14 vertices) - locked as tuples
export const CSASZAR_VERTICES = [
  [0, 0, 1.5],
  [1.2, 0, 0.6],
  [0.6, 1.04, 0.6],
  [-0.6, 1.04, 0.6],
  [-1.2, 0, 0.6],
  [0.6, -1.04, 0.6],
  [1.2, 0, -0.6],
  [0.6, 1.04, -0.6],
  [-0.6, 1.04, -0.6],
  [-1.2, 0, -0.6],
  [0.6, -1.04, -0.6],
  [0, 0, -1.5],
  [0, 1.5, 0],
  [0, -1.5, 0],
] satisfies readonly Vec3T[];

// Császár polyhedron faces (21 triangular faces) - locked as tuples
export const CSASZAR_FACES = [
  [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 1],
  [1, 6, 7], [1, 7, 2], [2, 7, 8], [2, 8, 3], [3, 8, 9],
  [3, 9, 4], [4, 9, 10], [4, 10, 5], [5, 10, 6], [5, 6, 1],
  [6, 11, 7], [7, 11, 8], [8, 11, 9], [9, 11, 10], [10, 11, 6],
  [12, 0, 1], [12, 1, 2], [12, 2, 3], [12, 3, 4], [12, 4, 5], [12, 5, 0],
  [13, 0, 5], [13, 5, 1], [13, 1, 6], [13, 6, 7], [13, 7, 8], [13, 8, 9], [13, 9, 10], [13, 10, 6], [13, 6, 0],
] satisfies readonly TriIndices[];

// Face labels A..N (14 faces)
const FACE_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"] as const;
type FaceLabel = typeof FACE_LABELS[number];

/** Convert face index to label (A..N). */
export function faceIndexToLabel(faceIndex: number): string {
  return FACE_LABELS[faceIndex] || "?";
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
  for (const c of addr.path) tri = loopSubdivide(tri)[c];
  return tri;
}

/** Build edge set from faces. */
export function buildEdgeSet(faces: Tri[]): Set<string> {
  const edges = new Set<string>();
  for (const face of faces) {
    for (let i = 0; i < 3; i++) {
      const a = face[i]!;
      const b = face[(i + 1) % 3]!;
      edges.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    }
  }
  return edges;
}

/** Calculate centroid of a triangle by face index. */
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

/** Calculate normal vector of a triangle by face index. */
export function faceNormal(faceIndex: number): Vec3 {
  const f = safe(CSASZAR_FACES, faceIndex);
  const a = safe(CSASZAR_VERTICES, f[0]!);
  const b = safe(CSASZAR_VERTICES, f[1]!);
  const c = safe(CSASZAR_VERTICES, f[2]!);
  
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
  
  const nx = ab[1] * ac[2] - ab[2] * ac[1];
  const ny = ab[2] * ac[0] - ab[0] * ac[2];
  const nz = ab[0] * ac[1] - ab[1] * ac[0];
  
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  return [nx / len, ny / len, nz / len] as const;
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
    if (!tri) continue;
    
    const baseIndex = positions.length / 3;
    
    // Add vertices from triangle indices
    const v0 = safe(CSASZAR_VERTICES, tri[0]!);
    const v1 = safe(CSASZAR_VERTICES, tri[1]!);
    const v2 = safe(CSASZAR_VERTICES, tri[2]!);
    
    positions.push(v0[0], v0[1], v0[2]);
    positions.push(v1[0], v1[1], v1[2]);
    positions.push(v2[0], v2[1], v2[2]);
    
    // Add triangle indices
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
  }
  
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}