export type WorkerInit = { levels: number };
export type WorkerFrameMsg = { type: 'frame'; t: number; layer: number; bitmap: ImageBitmap };
export type WorkerConfigMsg = { type: 'config'; levels: number };
export type WorkerOut = {
  type: 'report';
  t: number;
  windowMs: number;
  summary: string;
  metrics: { convergence: number; fractalDim: number; energyMean: number };
  topMotifs: { motif: string; count: number }[];
};

// Lightweight re-implement (worker-local) — copies of buildPyramid/pHash/etc
const B32 = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
const toLum = (r: number, g: number, b: number) => (r * 299 + g * 587 + b * 114) / 1000;
const b32 = (x: bigint, digits = 16) => { let s=''; let n=x; for (let i=0;i<digits;i++){ s += B32[Number(n & 31n)]; n >>= 5n; } return s; };

function buildPyramidBitmap(bmp: ImageBitmap, levels = 4) {
  const cvs = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = cvs.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  const out: { width: number; height: number; data: Uint8ClampedArray }[] = [];
  const img0 = ctx.getImageData(0,0,bmp.width,bmp.height);
  out.push({ width: bmp.width, height: bmp.height, data: img0.data });
  let cur = img0;
  for (let i=1;i<levels;i++){
    const w2 = Math.max(1, cur.width>>1), h2 = Math.max(1, cur.height>>1);
    const cvs2 = new OffscreenCanvas(w2,h2);
    const c2 = cvs2.getContext('2d')!;
    // box filter via drawImage scaling
    c2.drawImage(cvs, 0,0,cur.width,cur.height, 0,0,w2,h2);
    const img = c2.getImageData(0,0,w2,h2);
    out.push({ width: w2, height: h2, data: img.data });
    // prepare for next
    (cvs as any).width = w2; (cvs as any).height = h2; // resize inplace
    ctx.drawImage(cvs2,0,0);
    cur = img;
  }
  return out;
}

function pHash(level: { width:number;height:number;data:Uint8ClampedArray }, grid=8): bigint {
  const gx = Math.max(1, Math.floor(level.width / grid));
  const gy = Math.max(1, Math.floor(level.height / grid));
  let bits = 0n, iBit = 0n;
  for (let gyi=0; gyi<grid; gyi++){
    for (let gxi=0; gxi<grid; gxi++){
      let sum=0, n=0;
      for (let y=gyi*gy; y<Math.min((gyi+1)*gy, level.height); y++){
        for (let x=gxi*gx; x<Math.min((gxi+1)*gx, level.width); x++){
          const i=(y*level.width + x)*4; 
          if (i + 2 < level.data.length) {
            sum += toLum(level.data[i] ?? 0, level.data[i+1] ?? 0, level.data[i+2] ?? 0); n++;
          }
        }
      }
      const avg = sum / Math.max(1,n);
      bits |= (avg > 127 ? 1n : 0n) << iBit++;
    }
  }
  return bits;
}

function energy(level:{width:number;height:number;data:Uint8ClampedArray}){
  let e=0, n=level.data.length/4; 
  for(let i=0;i<level.data.length;i+=4){ 
    if (i + 2 < level.data.length) {
      e += Math.abs(toLum(level.data[i] ?? 0, level.data[i+1] ?? 0, level.data[i+2] ?? 0) - 128); 
    }
  } 
  return e/Math.max(1,n);
}

function fractalDim(level:{width:number;height:number;data:Uint8ClampedArray}){
  const w=level.width,h=level.height,data=level.data; const bin=new Uint8Array(w*h);
  for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const i=(y*w+x)*4; 
    if (i + 2 < data.length) {
      bin[y*w+x] = toLum(data[i] ?? 0, data[i+1] ?? 0, data[i+2] ?? 0)>140?1:0; 
    }
  } }
  const steps=[16,8,4,2]; const pts:{x:number;y:number}[]=[];
  for(const s of steps){ const bs=Math.max(1,Math.floor(Math.min(w,h)/s)); let count=0; for(let by=0;by<h;by+=bs){ for(let bx=0;bx<w;bx+=bs){ let filled=0; for(let y=by;y<Math.min(by+bs,h);y++){ for(let x=bx;x<Math.min(bx+bs,w);x++){ if(bin[y*w+x]){ filled=1; break;} } if(filled)break; } count+=filled; } }
    const eps = bs/Math.max(w,h); pts.push({x:Math.log(1/eps), y:Math.log(Math.max(1,count))}); }
  const n=pts.length; const sx=pts.reduce((a,p)=>a+p.x,0), sy=pts.reduce((a,p)=>a+p.y,0), sxx=pts.reduce((a,p)=>a+p.x*p.x,0), sxy=pts.reduce((a,p)=>a+p.x*p.y,0);
  const denom = n*sxx - sx*sx; const slope = denom!==0? (n*sxy - sx*sy)/denom : 0; return Math.max(0,Math.min(2,slope));
}

let cfg: WorkerInit = { levels: 4 };

self.onmessage = async (ev: MessageEvent<WorkerFrameMsg | WorkerConfigMsg>) => {
  const msg = ev.data;
  if (msg.type === 'config') { cfg.levels = msg.levels; return; }
  if (msg.type === 'frame') {
    const pyr = buildPyramidBitmap(msg.bitmap, cfg.levels);
    const obs = pyr.map((lvl)=>({ motif: b32(pHash(lvl,8)), energy: energy(lvl) }));
    const counts = new Map<string, number>();
    for (const o of obs) counts.set(o.motif, (counts.get(o.motif)||0)+1);
    const top = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([motif,count])=>({motif,count}));
    const convergence = obs.length? (top[0]?.count||0)/obs.length : 0;
    const report: WorkerOut = {
      type: 'report', t: msg.t, windowMs: 0,
      summary: top.length? `Convergence ${Math.round(convergence*100)}% — motifs: ${top.map(m=>`${m.motif}×${m.count}`).join(', ')}` : 'No motif convergence',
      metrics: { convergence, fractalDim: pyr[0] ? fractalDim(pyr[0]) : 0, energyMean: obs[0]?.energy||0 },
      topMotifs: top,
    };
    (self as any).postMessage(report);
    msg.bitmap.close();
  }
};
