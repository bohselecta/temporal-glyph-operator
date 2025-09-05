import { mcPiKernel, sumRangeKernel, meanVarKernel, fftSynthKernel, matmulSynthKernel } from './kernels';
import { Reducer, reducers } from './reducers';
import { WorkerPool } from './workerPool';

export enum NodeOp { MC_PI='mc_pi', SUM_RANGE='sum_range', MEANVAR_RANGE='meanvar_range', FFT_SYNTH='fft_synth', MATMUL_SYNTH='matmul_synth' }

export type FEG = {
  jobId: string,
  nodes: { id:string, op:NodeOp, params:any }[],
  reducer: { kind: keyof typeof reducers }
};

type Callbacks = {
  onMetrics: (m:{convergence:number; throughput:number; tick:number})=>void;
  onAnswer: (ans:string, bounds?:{lo:number;hi:number})=>void;
  onStop: ()=>void;
};

export class Scheduler {
  private cb:Callbacks;
  private stopFlag=false;
  private tick=0;
  private throughput=0;
  private reducer: Reducer;
  private pool?: WorkerPool;

  constructor(cb:Callbacks){ this.cb = cb; this.reducer = reducers.sum(); } // placeholder, real set in run

  stop(){ this.stopFlag = true; }

  async run(feg: FEG){
    this.pool?.destroy();
    this.pool = new WorkerPool();
    
    this.stopFlag = false;
    this.tick = 0;
    this.throughput = 0;
    this.reducer = reducers[feg.reducer.kind]();

    const node = feg.nodes[0]; // simple 1-node jobs for now
    if (!node) return;
    const batch = 50_000; // bigger batches now
    const tStart = performance.now();

    while(!this.stopFlag){
      // fire N parallel chunks per tick
      const PAR = 8;
      const jobs = Array.from({length:PAR}, (_,i)=> this.pool!.exec({
        op: node.op, params: node.params, batch, jobSeed: feg.jobId, tick: this.tick*PAR+i
      }));
      const outs = await Promise.all(jobs);
      let work=0;
      for (const out of outs){ this.reducer.ingest(out.partials); work += out.work; }
      this.throughput = Math.round((this.throughput*0.5) + (work*4)); // EWMA

      this.tick++;
      if (performance.now() - tStart > 150){
        const { value, convergence, bounds } = this.reducer.snapshot();
        this.cb.onMetrics({ convergence, throughput:this.throughput, tick:this.tick });
        if (value !== undefined) this.cb.onAnswer(value, bounds);
      }
      await new Promise(r=>setTimeout(r,0));
    }
    this.pool.destroy();
    this.cb.onStop();
  }
}

function pickKernel(op:NodeOp){
  switch(op){
    case NodeOp.MC_PI: return mcPiKernel;
    case NodeOp.SUM_RANGE: return sumRangeKernel;
    case NodeOp.MEANVAR_RANGE: return meanVarKernel;
    case NodeOp.FFT_SYNTH: return fftSynthKernel;
    case NodeOp.MATMUL_SYNTH: return matmulSynthKernel;
  }
}
