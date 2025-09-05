export type Sample = { layer:number; level:number; hash:bigint; energy:number; grad:number };
export type Strategy = (samples: Sample[]) => Sample[];

/** Uniform: identity */
export const uniform: Strategy = (s) => s;

/** Energy-biased: duplicate top-k energy samples to amplify their vote */
export function energyBiased(k = 2): Strategy {
  return (s) => {
    const sorted = [...s].sort((a,b)=>b.energy-a.energy);
    const top = sorted.slice(0, Math.min(k, sorted.length));
    return [...s, ...top];
  };
}

/** Address-aware (placeholder): prefer lower levels to stabilize motif */
export function addressAware(): Strategy {
  return (s) => {
    const low = s.filter(x=>x.level<=1);
    return [...s, ...low];
  };
}
