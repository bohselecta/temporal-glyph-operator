import { buildPyramid } from '../../packages/vision-kernel/dist/index.js';

function randFrame(w,h){
  const pixels = new Uint8ClampedArray(w*h*4);
  for(let i=0;i<pixels.length;i+=4){ pixels[i]=Math.random()*255|0; pixels[i+1]=Math.random()*255|0; pixels[i+2]=Math.random()*255|0; pixels[i+3]=255; }
  return { t: performance.now(), layer: 0, width:w, height:h, pixels };
}

const N=50; const frame = randFrame(512,512);
let total=0; for(let i=0;i<N;i++){ const t0=performance.now(); buildPyramid(frame,6); total += performance.now()-t0; }
console.log(`buildPyramid x${N} avg ${(total/N).toFixed(2)} ms`);
