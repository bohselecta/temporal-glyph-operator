export type Reducer = {
  ingest: (partials:any)=>void;
  snapshot: ()=>{ value?:string, convergence:number, bounds?:{lo:number;hi:number} };
};

function piReducer(): Reducer {
  let inside=0, total=0;
  return {
    ingest(p){ inside+=p.inside; total+=p.total; },
    snapshot(){
      if (total===0) return { convergence:0 };
      const pi = 4*inside/total;
      const err = 1/Math.sqrt(total); // rough bound
      return { value: pi.toFixed(7), bounds:{ lo: +(pi-err).toFixed(7), hi: +(pi+err).toFixed(7) }, convergence: Math.min(1, 1 - err) };
    }
  };
}

function sumReducer(): Reducer {
  let sum=0, count=0, target=1e9; // target is heuristic for convergence bar
  return {
    ingest(p){ sum += p.sum; count += p.count; },
    snapshot(){ return { value: sum.toString(), convergence: Math.min(1, count/target) }; }
  };
}

function sumExactReducer(): Reducer {
  let sum = 0n, count=0n, target=1_000_000n;
  return {
    ingest(p){ sum += BigInt(Math.trunc(p.sum)); count += BigInt(p.count); },
    snapshot(){ return { value: sum.toString()+'n', convergence: Number(count) / Number(target) }; }
  };
}

function meanVarReducer(): Reducer {
  let sum=0, sumsq=0, count=0;
  return {
    ingest(p){ sum+=p.sum; sumsq+=p.sumsq; count+=p.count; },
    snapshot(){
      if (!count) return { convergence:0 };
      const mean = sum/count;
      const var_ = sumsq/count - mean*mean;
      const err = 1/Math.sqrt(count);
      return { value:`mean=${mean.toFixed(6)} var=${var_.toExponential(3)}`, bounds:{lo:mean-err, hi:mean+err}, convergence: Math.min(1, 1-err) };
    }
  };
}

function fftEnergyReducer(): Reducer {
  let energy=0, count=0;
  return {
    ingest(p){ energy+=p.energy; count+=p.count; },
    snapshot(){ return { value:`energy≈${energy.toFixed(2)}`, convergence: Math.min(1, count/1e7) }; }
  };
}

function tileSumReducer(): Reducer {
  let dot=0, tiles=0;
  return {
    ingest(p){ dot+=p.dotSum; tiles+=p.tiles; },
    snapshot(){ return { value:`tiles=${tiles} dotSum=${dot.toFixed(2)}`, convergence: Math.min(1, tiles/1e6) }; }
  };
}

export const reducers = {
  'pi': piReducer,
  'sum': sumReducer,
  'sum-exact': sumExactReducer,
  'meanvar': meanVarReducer,
  'fft-energy': fftEnergyReducer,
  'tile-sum': tileSumReducer,
};
