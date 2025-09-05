/// <reference lib="webworker" />
import { mcPiKernel, sumRangeKernel, meanVarKernel, fftSynthKernel, matmulSynthKernel } from './kernels';
import { NodeOp } from './scheduler';

type Msg = { id:number; op:NodeOp; params:any; batch:number; jobSeed:string; tick:number; };

const pick = (op:NodeOp)=>({
  [NodeOp.MC_PI]: mcPiKernel,
  [NodeOp.SUM_RANGE]: sumRangeKernel,
  [NodeOp.MEANVAR_RANGE]: meanVarKernel,
  [NodeOp.FFT_SYNTH]: fftSynthKernel,
  [NodeOp.MATMUL_SYNTH]: matmulSynthKernel,
}[op]);

self.addEventListener('message', (e:MessageEvent<Msg>)=>{
  const m = e.data; 
  const k = pick(m.op)!;
  const out = k(m.params, m.batch, m.jobSeed, m.tick);
  postMessage({ id:m.id, out });
});
