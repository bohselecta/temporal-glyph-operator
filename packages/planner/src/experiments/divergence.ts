export interface Run {
  t: number;
  strategy: string;
  value: number;
}

export interface BucketedSeries {
  strategy: string;
  points: Array<{ t: number; value: number; count: number }>;
}

export interface DivergencePoint {
  t: number;
  d: number; // divergence value
}

/**
 * Bucketize runs by time windows and strategy
 */
export function bucketize(runs: Run[], bucketMs = 2000): BucketedSeries[] {
  const byStrategy = new Map<string, Run[]>();
  
  for (const run of runs) {
    const existing = byStrategy.get(run.strategy) || [];
    existing.push(run);
    byStrategy.set(run.strategy, existing);
  }
  
  const series: BucketedSeries[] = [];
  
  for (const [strategy, strategyRuns] of byStrategy) {
    // Sort by time
    strategyRuns.sort((a, b) => a.t - b.t);
    
    // Group into buckets
    const buckets = new Map<number, Run[]>();
    for (const run of strategyRuns) {
      const bucket = Math.floor(run.t / bucketMs) * bucketMs;
      const existing = buckets.get(bucket) || [];
      existing.push(run);
      buckets.set(bucket, existing);
    }
    
    // Convert to points
    const points = Array.from(buckets.entries())
      .map(([t, runs]) => {
        const sum = runs.reduce((acc, r) => acc + r.value, 0);
        return { t, value: sum / runs.length, count: runs.length };
      })
      .sort((a, b) => a.t - b.t);
    
    series.push({ strategy, points });
  }
  
  return series;
}

/**
 * Calculate MSE divergence between two series
 */
export function divergenceMSE(seriesA: BucketedSeries, seriesB: BucketedSeries): DivergencePoint[] {
  const result: DivergencePoint[] = [];
  
  // Find common time points
  const timesA = new Set(seriesA.points.map(p => p.t));
  const timesB = new Set(seriesB.points.map(p => p.t));
  const commonTimes = Array.from(timesA).filter(t => timesB.has(t)).sort((a, b) => a - b);
  
  for (const t of commonTimes) {
    const pointA = seriesA.points.find(p => p.t === t);
    const pointB = seriesB.points.find(p => p.t === t);
    
    if (pointA && pointB) {
      const d = Math.pow(pointA.value - pointB.value, 2);
      result.push({ t, d });
    }
  }
  
  return result;
}

/**
 * Calculate pairwise divergences from a baseline strategy
 */
export function pairwiseDivergences(series: BucketedSeries[], baselineStrategy: string): Record<string, DivergencePoint[]> {
  const baseline = series.find(s => s.strategy === baselineStrategy);
  if (!baseline) return {};
  
  const result: Record<string, DivergencePoint[]> = {};
  
  for (const s of series) {
    if (s.strategy !== baselineStrategy) {
      result[s.strategy] = divergenceMSE(s, baseline);
    }
  }
  
  return result;
}
