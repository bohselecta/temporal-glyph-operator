import type { Address } from "./addressing/hierarchy";

export interface Key {
  id: string;
  mask: Address;
  permissions?: string[];
}

/**
 * Check if a key permits access to an address
 * This is a placeholder implementation - actual key system would be more sophisticated
 */
export function keyPermits(key: Key, addr: Address): boolean {
  // For now, just check if the address starts with the mask
  return addr.startsWith(key.mask);
}

/**
 * Create a new key with specified mask
 */
export function createKey(id: string, mask: Address, permissions?: string[]): Key {
  return { id, mask, permissions };
}

/**
 * Validate key format
 */
export function validateKey(key: Key): boolean {
  return typeof key.id === 'string' && 
         typeof key.mask === 'string' && 
         key.mask.length > 0;
}
