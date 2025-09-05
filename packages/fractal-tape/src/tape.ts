import { bytesToBase4, base4ToBytes, shuffleDigits, unshuffleDigits } from "./base4";

export type Address = string;
export type Value = any;

/**
 * Deterministic, geometry-addressable tape.
 * Encodes values as base-4 glyph paths that extend Császár face addressing.
 */
export class Tape {
  private seed: string;
  private tick = 0;

  constructor(seed: string) {
    this.seed = seed;
  }

  /**
   * Write a value to the tape, returning a new address.
   * @param baseAddr Base address (e.g., "A:0")
   * @param value Value to encode
   * @param tick Optional tick for deterministic ordering
   * @returns New address with encoded value
   */
  write(baseAddr: string, value: Value, tick?: number): Address {
    const currentTick = tick ?? this.tick++;
    
    // Serialize value to JSON
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    
    // Convert to base-4
    const base4 = bytesToBase4(bytes);
    
    // Shuffle for obfuscation
    const shuffled = shuffleDigits(base4, this.seed, baseAddr, currentTick);
    
    // Convert to address path segments
    const segments = shuffled.split('').map(d => `c=${d}`);
    const newAddr = `${baseAddr}:${segments.length}:${segments.join(':')}`;
    
    return newAddr;
  }

  /**
   * Read a value from the tape.
   * @param addr Address containing encoded value
   * @returns Original value
   */
  read(addr: Address): Value {
    const parts = addr.split(':');
    if (parts.length < 3) {
      throw new Error(`Invalid address format: ${addr}`);
    }
    
    const baseAddr = `${parts[0]}:${parts[1]}`;
    const depth = parseInt(parts[2] || '0', 10);
    
    if (parts.length < 3 + depth) {
      throw new Error(`Insufficient path segments: ${addr}`);
    }
    
    // Extract base-4 digits from path segments
    const digits = parts.slice(3, 3 + depth).map(seg => {
      const match = seg.match(/c=(\d)/);
      if (!match) throw new Error(`Invalid path segment: ${seg}`);
      return match[1];
    }).join('');
    
    // Unshuffle
    const unshuffled = unshuffleDigits(digits, this.seed, baseAddr, 0);
    
    // Convert back to bytes
    const bytes = base4ToBytes(unshuffled);
    
    // Deserialize JSON
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  /**
   * Get the current tick counter.
   */
  getTick(): number {
    return this.tick;
  }

  /**
   * Set the tick counter.
   */
  setTick(tick: number): void {
    this.tick = tick;
  }

  /**
   * Get the seed.
   */
  getSeed(): string {
    return this.seed;
  }
}
