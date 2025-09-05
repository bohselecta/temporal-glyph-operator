import { addrPRNG } from './tape';

export function mcPiKernel(params:{samples:number}, batch:number, jobSeed:string, tick:number){
  const prng = addrPRNG(jobSeed, tick);
  let inside=0, total=0;
  const n = Math.min(batch, params.samples);
  for (let i=0;i<n;i++){
    const x = prng(), y = prng();
    if (x*x + y*y <= 1) inside++;
    total++;
  }
  return { work:n, partials:{ inside, total } };
}

export function sumRangeKernel(params:{a:number,b:number,step:number}, batch:number, jobSeed:string, tick:number){
  const {a,b,step} = params;
  const startIndex = tick * batch;
  const start = a + startIndex*step;
  let sum=0, count=0;
  for (let x=start; x<=b && count<batch; x+=step){ sum += x; count++; }
  return { work:count, partials:{ sum, count } };
}

export function meanVarKernel(params:{a:number,b:number,step:number}, batch:number, jobSeed:string, tick:number){
  const {a,b,step} = params;
  const startIndex = tick * batch;
  const start = a + startIndex*step;
  let sum=0, sumsq=0, count=0;
  for (let x=start; x<=b && count<batch; x+=step){ sum+=x; sumsq+=x*x; count++; }
  return { work:count, partials:{ sum, sumsq, count } };
}

// Placeholder FFT & Matmul — synthetic workload for UI + reducers
export function fftSynthKernel(params:{n:number}, batch:number, jobSeed:string, tick:number){
  const prng = addrPRNG(jobSeed, tick);
  let energy=0, work=0;
  const n = Math.min(batch, params.n);
  for (let i=0;i<n;i++){ const r=prng()-0.5, im=prng()-0.5; energy += r*r+im*im; work++; }
  return { work, partials:{ energy, count:work } };
}

export function matmulSynthKernel(params:{M:number,N:number,density:number}, batch:number, jobSeed:string, tick:number){
  // simulate tile dot products proportional to density
  const prng = addrPRNG(jobSeed, tick);
  let dotSum=0, count=0;
  const tiles = batch;
  for (let t=0;t<tiles;t++){
    const nnz = Math.max(1, Math.floor(params.N * params.density));
    let dot=0; for (let i=0;i<nnz;i++){ dot += (prng()-0.5)*(prng()-0.5); }
    dotSum += dot; count++;
  }
  return { work:tiles, partials:{ dotSum, tiles:count } };
}
