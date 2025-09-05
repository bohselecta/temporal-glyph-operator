import type { Frame } from "@glyph/core";
import { buildPyramid, pHash } from "@glyph/vision-kernel";

export type ViewSample = {
  layer: number;
  level: number;
  hash: bigint;
  energy: number; // simple activity measure
};

export function sampleFrame(frame: Frame, levels = 4): ViewSample[] {
  const pyr = buildPyramid(frame, levels);
  return pyr.levels.map((lvl, idx) => {
    const h = pHash(lvl, 8);
    let energy = 0;
    for (let i=0;i<lvl.data.length;i+=4) {
      energy += Math.abs((lvl.data[i] ?? 0) - 128); // quick n dirty
    }
    energy /= (lvl.data.length/4);
    return { layer: frame.layer, level: idx, hash: h, energy };
  });
}
