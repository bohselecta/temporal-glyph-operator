export function encodePathToIndex(levels: number, baseFaceIndex: number, path: number[]) {
  const pow4 = Math.pow(4, levels);
  let offset = 0; 
  for (let i = 0; i < path.length; i++) {
    const pathValue = path[i];
    if (pathValue !== undefined) {
      offset = (offset << 2) | (pathValue & 3);
    }
  }
  return baseFaceIndex * pow4 + offset;
}
