/**
 * Base-4 encoding/decoding for glyph digits (0-3).
 * Used to encode data into Császár face addressing paths.
 */

/**
 * Convert bytes to base-4 string using glyph digits 0-3.
 */
export function bytesToBase4(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    // Convert each byte to 2 base-4 digits
    result += (byte >> 6).toString(4); // First 2 bits
    result += ((byte >> 4) & 3).toString(4); // Next 2 bits
    result += ((byte >> 2) & 3).toString(4); // Next 2 bits
    result += (byte & 3).toString(4); // Last 2 bits
  }
  return result;
}

/**
 * Convert base-4 string back to bytes.
 */
export function base4ToBytes(base4: string): Uint8Array {
  const digits = base4.split('').map(d => parseInt(d, 4));
  const result = new Uint8Array(Math.ceil(digits.length / 4));
  
  for (let i = 0; i < digits.length; i += 4) {
    const byte = ((digits[i] || 0) << 6) | 
                 ((digits[i + 1] || 0) << 4) | 
                 ((digits[i + 2] || 0) << 2) | 
                 (digits[i + 3] || 0);
    result[Math.floor(i / 4)] = byte;
  }
  
  return result;
}

/**
 * Shuffle base-4 digits using deterministic PRNG.
 */
export function shuffleDigits(digits: string, seed: string, baseAddr: string, tick: number): string {
  // Simple deterministic shuffle using FNV-1a hash
  let hash = 2166136261 >>> 0;
  const key = `${seed}:${baseAddr}:${tick}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  const result = digits.split('');
  for (let i = result.length - 1; i > 0; i--) {
    hash = Math.imul(hash, 1103515245) + 12345;
    const j = Math.abs(hash) % (i + 1);
    const temp = result[i];
    result[i] = result[j]!;
    result[j] = temp;
  }
  
  return result.join('');
}

/**
 * Unshuffle base-4 digits (reverse of shuffle).
 */
export function unshuffleDigits(digits: string, seed: string, baseAddr: string, tick: number): string {
  // Reverse shuffle by running the same algorithm backwards
  let hash = 2166136261 >>> 0;
  const key = `${seed}:${baseAddr}:${tick}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  const result = digits.split('');
  const indices: number[] = [];
  
  // Record the shuffle sequence
  for (let i = result.length - 1; i > 0; i--) {
    hash = Math.imul(hash, 1103515245) + 12345;
    const j = Math.abs(hash) % (i + 1);
    indices.push(j);
  }
  
  // Reverse the shuffle
  for (let i = indices.length - 1; i >= 0; i--) {
    const j = indices[i]!;
    const temp = result[i + 1];
    result[i + 1] = result[j]!;
    result[j] = temp;
  }
  
  return result.join('');
}
