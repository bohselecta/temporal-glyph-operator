export type Address = `${string}:${number}${string}`;

export interface AddressMapper { 
  locate(jobId: string): Address;
}

// Simple implementation for now
export class SimpleAddressMapper implements AddressMapper {
  locate(jobId: string): Address {
    // Simple hash-based addressing for now
    const hash = this.simpleHash(jobId);
    const face = String.fromCharCode(65 + (hash % 26)); // A-Z
    const depth = (hash % 3) + 1;
    const tri = `A${hash % 10}`;
    const child = hash % 5;
    return `${face}:${depth}:${tri}:child=${child}` as Address;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const mapper = new SimpleAddressMapper();
