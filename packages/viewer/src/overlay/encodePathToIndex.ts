/**
 * Encode an address path to a subdivided face index.
 * Works for subdivision levels L=0..N.
 */
export function encodePathToIndex(faceIndex: number, path: number[], levels: number): number {
  if (levels === 0) return faceIndex;
  
  // Start with base face
  let currentIndex = faceIndex;
  
  // For each subdivision level, multiply by 4 and add the child index
  for (let level = 0; level < levels && level < path.length; level++) {
    currentIndex = currentIndex * 4 + path[level];
  }
  
  return currentIndex;
}

/**
 * Decode a subdivided face index back to base face and path.
 */
export function decodeIndexToPath(subdividedIndex: number, levels: number): { faceIndex: number; path: number[] } {
  if (levels === 0) {
    return { faceIndex: subdividedIndex, path: [] };
  }
  
  const path: number[] = [];
  let currentIndex = subdividedIndex;
  
  // Work backwards through subdivision levels
  for (let level = levels - 1; level >= 0; level--) {
    path.unshift(currentIndex % 4);
    currentIndex = Math.floor(currentIndex / 4);
  }
  
  return { faceIndex: currentIndex, path };
}
