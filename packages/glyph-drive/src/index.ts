// Single public surface — no star exports anywhere.
export type { Address, FaceId, ChildIndex, ParsedAddress } from "./addressing/hierarchy";
export { encodeAddress, parseAddress, jobIdToBaseFace, faceIdToLabel } from "./addressing/hierarchy";
export { encodePathToIndex } from "./addressing/path-index";
export {
  CSASZAR_VERTICES,
  CSASZAR_FACES,
  buildEdgeSet,
  faceCentroid as centroid,
  faceNormal,
  loopSubdivide,
  faceIndexToLabel,
  labelToFaceIndex,
  triangleAt,
  buildIndexed,
} from "./geometry/csaszar";
export type { Vec3T as Vec3, TriIndices as TriIndex, TriCoords } from "./geometry/types";

export type Payload = { result: unknown; meta: Record<string, unknown> };

export interface GlyphDrive {
  attachPayload(addr: Address, payload: Payload): Promise<void> | void;
  emitBadge?(addr: Address, badge: string): void;
}

// Re-export key functions
export { keyPermits, createKey, validateKey } from "./keys";
export type { Key } from "./keys";

// Example in-memory impl sketch (replace with your real one)
export class InMemoryDrive implements GlyphDrive {
  #store = new Map<Address, Payload[]>();
  
  attachPayload(addr: Address, payload: Payload) {
    const list = this.#store.get(addr) ?? [];
    list.push(payload);
    this.#store.set(addr, list);
  }
  
  emitBadge() {}
  
  // Additional methods for querying
  getPayloads(addr: Address): Payload[] {
    return this.#store.get(addr) ?? [];
  }
  
  getAllAddresses(): Address[] {
    return Array.from(this.#store.keys());
  }
  
  clear() {
    this.#store.clear();
  }
}

// Export singleton instance
export const drive = new InMemoryDrive();
