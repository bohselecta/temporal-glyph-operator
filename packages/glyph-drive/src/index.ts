// Addressing & Geometry exports
export type { Address } from "./addressing/hierarchy";
export type Payload = { result: unknown; meta: Record<string, unknown> };

export interface GlyphDrive {
  attachPayload(addr: Address, payload: Payload): Promise<void> | void;
  emitBadge?(addr: Address, badge: string): void;
}
export { encodeAddress, parseAddress, jobIdToBaseFace, faceIdToLabel } from "./addressing/hierarchy";
export type { Vec3, Tri, ParsedAddress } from "./geometry";
export { 
  CSASZAR_FACES, 
  CSASZAR_VERTICES, 
  triangleAt, 
  centroid, 
  faceCentroid, 
  faceNormal,
  buildEdgeSet,
  faceIndexToLabel,
  labelToFaceIndex,
  loopSubdivide
} from "./geometry";

// Re-export all addressing functions
export { 
  jobIdToBaseFace, 
  encodeAddress, 
  parseAddress, 
  faceIdToLabel 
} from "./addressing/hierarchy";

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
