export type Address = `${string}`;
export type Payload = { result: unknown; meta: Record<string, unknown> };

export interface GlyphDrive {
  attachPayload(addr: Address, payload: Payload): Promise<void> | void;
  emitBadge?(addr: Address, badge: string): void;
}

// Addressing & Geometry exports
export type { Address } from "./addressing/hierarchy";
export { encodeAddress, parseAddress, jobIdToBaseFace, faceIdToLabel } from "./addressing/hierarchy";
export type { Vec3, Tri } from "./geometry/torus14";
export { baseFaces14, triangleAt, centroid } from "./geometry/torus14";

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
