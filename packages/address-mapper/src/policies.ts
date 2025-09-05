import type { Address } from "@glyph/glyph-drive";

export interface PolicyContext {
  seed: string;
  jobId: string;
  args: any;
}

export type AddressPolicy = (ctx: PolicyContext, depth?: number) => Address;

/**
 * Uniform policy - distributes jobs evenly across base faces
 */
export function uniformPolicy(ctx: PolicyContext, depth = 0): Address {
  const { jobId } = ctx;
  // Simple hash-based distribution
  let h = 0;
  for (let i = 0; i < jobId.length; i++) {
    h = (h * 131 + jobId.charCodeAt(i)) >>> 0;
  }
  const face = h % 14;
  const path: (0|1|2|3)[] = [];
  for (let d = 0; d < depth; d++) {
    path.push(((h >>> (d * 2)) & 3) as 0|1|2|3);
  }
  return `${String.fromCharCode(65 + face)}:${depth}${path.map(p => `:c=${p}`).join('')}` as Address;
}

/**
 * Energy-biased policy - clusters jobs based on computational intensity
 */
export function energyBiasedPolicy(ctx: PolicyContext, depth = 0): Address {
  const { args } = ctx;
  // Use args to determine energy level and cluster accordingly
  const energy = args?.trials || args?.iterations || 1000;
  const energyLevel = Math.min(3, Math.floor(Math.log10(energy) / 2));
  
  // Map energy to face clusters
  const face = (energyLevel * 3) % 14;
  const path: (0|1|2|3)[] = [];
  
  // Add depth based on energy
  for (let d = 0; d < depth + energyLevel; d++) {
    path.push(((energy >>> (d * 2)) & 3) as 0|1|2|3);
  }
  
  return `${String.fromCharCode(65 + face)}:${depth + energyLevel}${path.map(p => `:c=${p}`).join('')}` as Address;
}

/**
 * Motif-aware policy - groups jobs by expected motif patterns
 */
export function motifAwarePolicy(ctx: PolicyContext, depth = 0): Address {
  const { jobId, args } = ctx;
  // Analyze job characteristics for motif prediction
  const kernel = args?.kernel || 'unknown';
  const motifType = kernel.includes('pi') ? 0 : kernel.includes('sum') ? 1 : 2;
  
  // Map motif types to face regions
  const face = (motifType * 4) % 14;
  const path: (0|1|2|3)[] = [];
  
  for (let d = 0; d < depth; d++) {
    const hash = jobId.charCodeAt(d % jobId.length);
    path.push(((hash >>> (d * 2)) & 3) as 0|1|2|3);
  }
  
  return `${String.fromCharCode(65 + face)}:${depth}${path.map(p => `:c=${p}`).join('')}` as Address;
}
