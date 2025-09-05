import { jobIdToBaseFace, encodeAddress } from "@glyph/glyph-drive";

export function locate(jobId: string, depth = 0): string {
  const face = jobIdToBaseFace(jobId);
  // For now, derive a deterministic child path from the hash.
  // Later, plug in strategy-aware mapping.
  const path: (0|1|2|3)[] = [];
  if (depth > 0) {
    let h = 0; for (let i=0;i<jobId.length;i++) h = (h*131 + jobId.charCodeAt(i)) >>> 0;
    for (let d=0; d<depth; d++) { path.push((h >>> (d*2)) & 3 as 0|1|2|3); }
  }
  return encodeAddress(face, path);
}
