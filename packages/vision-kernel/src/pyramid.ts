import type { Frame } from "@glyph/core";

export type Level = { scale: number; width: number; height: number; data: Uint8ClampedArray };
export type Pyramid = { levels: Level[]; t: number };

export function buildPyramid(frame: Frame, levels = 4): Pyramid {
  const out: Level[] = [];
  let { width, height } = frame;
  let data = frame.pixels;

  out.push({ scale: 1, width, height, data });
  for (let i = 1; i < levels; i++) {
    const w2 = Math.max(1, Math.floor(width / 2));
    const h2 = Math.max(1, Math.floor(height / 2));
    const d2 = new Uint8ClampedArray(w2*h2*4);
    // box filter downscale
    for (let y = 0; y < h2; y++) {
      for (let x = 0; x < w2; x++) {
        const xi = x*2, yi = y*2;
        const acc: [number, number, number, number] = [0,0,0,0];
        let count = 0;
        for (let dy=0; dy<2; dy++) for (let dx=0; dx<2; dx++) {
          const iSrc = ((yi+dy)*width + (xi+dx))*4;
          if (iSrc+3 < data.length) {
            const r = data[iSrc] ?? 0;
            const g = data[iSrc+1] ?? 0;
            const b = data[iSrc+2] ?? 0;
            const a = data[iSrc+3] ?? 0;
            acc[0]+=r; acc[1]+=g; acc[2]+=b; acc[3]+=a;
            count++;
          }
        }
        const iDst = (y*w2 + x)*4;
        if (iDst+3 < d2.length && count > 0) {
          d2[iDst]  = Math.round(acc[0]/count); 
          d2[iDst+1]= Math.round(acc[1]/count); 
          d2[iDst+2]= Math.round(acc[2]/count); 
          d2[iDst+3]= Math.round(acc[3]/count);
        }
      }
    }
    out.push({ scale: 1/Math.pow(2,i), width: w2, height: h2, data: d2 });
    data = d2; width = w2; height = h2;
  }
  return { levels: out, t: frame.t };
}

/** simple perceptual hash (grid-avg luminance) for quick motif detection */
export function pHash(level: Level, grid=8): bigint {
  const gx = Math.max(1, Math.floor(level.width / grid));
  const gy = Math.max(1, Math.floor(level.height / grid));
  let bits = 0n, bitIndex = 0n;
  for (let gyi = 0; gyi < grid; gyi++) {
    for (let gxi = 0; gxi < grid; gxi++) {
      let sum=0, n=0;
              for (let y=gyi*gy; y<Math.min((gyi+1)*gy, level.height); y++) {
          for (let x=gxi*gx; x<Math.min((gxi+1)*gx, level.width); x++) {
            const i=(y*level.width + x)*4;
            if (i+2 < level.data.length) {
              const lum = (level.data[i]!*299 + level.data[i+1]!*587 + level.data[i+2]!*114) / 1000;
              sum += lum; n++;
            }
          }
        }
      const avg = sum / Math.max(1,n);
      bits |= (avg > 127 ? 1n : 0n) << bitIndex++;
    }
  }
  return bits;
}
