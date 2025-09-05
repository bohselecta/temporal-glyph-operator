export type FaceId = number; // 0..13 (A..N)
export type Address = `${string}`; // e.g., A:2:c=3:c=1

const LETTERS = "ABCDEFGHIJKLMN"; // 14 base faces

export function faceIdToLabel(id: FaceId) { return LETTERS[id] as string; }
export function labelToFaceId(label: string): FaceId { return LETTERS.indexOf(label); }

/**
 * Stable hash → base face bucket (0..13). Keep deterministic across runs.
 */
export function jobIdToBaseFace(jobId: string): FaceId {
  let h = 2166136261 >>> 0; // FNV-1a 32-bit
  for (let i = 0; i < jobId.length; i++) {
    h ^= jobId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h % 14) as FaceId;
}

export type ChildIndex = 0 | 1 | 2 | 3; // 4-way split of a triangle

export interface ParsedAddress { face: FaceId; depth: number; path: ChildIndex[] }

/**
 * Addresses encode a path of 4-way triangle splits.
 * Format: `A:3:c=0:c=1:c=2` (A = base face, depth=3, then child indices)
 */
export function encodeAddress(face: FaceId, path: ChildIndex[]): Address {
  const label = faceIdToLabel(face);
  return [label, path.length, ...path.map((c) => `c=${c}`)].join(":") as Address;
}

export function parseAddress(addr: Address): ParsedAddress {
  const parts = addr.split(":");
  const face = labelToFaceId(parts[0]);
  const depth = Number(parts[1] || 0) | 0;
  const path = parts.slice(2).map((p) => Number(p.split("=")[1] || 0) as ChildIndex);
  return { face, depth, path };
}
