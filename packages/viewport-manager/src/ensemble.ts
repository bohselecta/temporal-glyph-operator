/**
 * Ensemble Strategy Runner — Research Rigor Pack
 * 
 * Run multiple sampling strategies in parallel and merge results
 * for comparative analysis and strategy evaluation
 */

import type { ViewSample } from "./plan.js";

export type EnsembleStrategy = (samples: ViewSample[]) => ViewSample[];
export type EnsembleResult = { 
  strategy: string; 
  samples: ViewSample[];
  metrics?: {
    convergence: number;
    energy: number;
    diversity: number;
  };
};

/**
 * Run multiple strategies in parallel on the same input
 */
export function runEnsemble(
  strategies: Record<string, EnsembleStrategy>, 
  samples: ViewSample[]
): EnsembleResult[] {
  return Object.entries(strategies).map(([name, strategy]) => {
    const result = strategy(samples);
    
    // Calculate basic metrics for this strategy result
    const metrics = calculateStrategyMetrics(result);
    
    return {
      strategy: name,
      samples: result,
      metrics
    };
  });
}

/**
 * Calculate basic metrics for a strategy result
 */
function calculateStrategyMetrics(samples: ViewSample[]): {
  convergence: number;
  energy: number;
  diversity: number;
} {
  if (samples.length === 0) {
    return { convergence: 0, energy: 0, diversity: 0 };
  }

  // Convergence: how many samples share the same motif
  const motifCounts = new Map<string, number>();
  samples.forEach(s => {
    const motif = s.hash.toString();
    motifCounts.set(motif, (motifCounts.get(motif) ?? 0) + 1);
  });
  const maxCount = Math.max(...motifCounts.values());
  const convergence = maxCount / samples.length;

  // Energy: average energy across samples
  const energy = samples.reduce((sum, s) => sum + s.energy, 0) / samples.length;

  // Diversity: number of unique motifs / total samples
  const diversity = motifCounts.size / samples.length;

  return { convergence, energy, diversity };
}

/**
 * Compare two ensemble results
 */
export function compareEnsembleResults(
  results: EnsembleResult[]
): {
  bestConvergence: string;
  bestEnergy: string;
  bestDiversity: string;
  divergence: number;
} {
  if (results.length < 2) {
    return {
      bestConvergence: results[0]?.strategy ?? 'none',
      bestEnergy: results[0]?.strategy ?? 'none',
      bestDiversity: results[0]?.strategy ?? 'none',
      divergence: 0
    };
  }

  const bestConvergence = results.reduce((best, current) => 
    (current.metrics?.convergence ?? 0) > (best.metrics?.convergence ?? 0) ? current : best
  ).strategy;

  const bestEnergy = results.reduce((best, current) => 
    (current.metrics?.energy ?? 0) > (best.metrics?.energy ?? 0) ? current : best
  ).strategy;

  const bestDiversity = results.reduce((best, current) => 
    (current.metrics?.diversity ?? 0) > (best.metrics?.diversity ?? 0) ? current : best
  ).strategy;

  // Calculate divergence between top two strategies
  const sorted = results.sort((a, b) => (b.metrics?.convergence ?? 0) - (a.metrics?.convergence ?? 0));
  const divergence = Math.abs(
    (sorted[0]?.metrics?.convergence ?? 0) - (sorted[1]?.metrics?.convergence ?? 0)
  );

  return {
    bestConvergence,
    bestEnergy,
    bestDiversity,
    divergence
  };
}

/**
 * Create a strategy comparison report
 */
export function createEnsembleReport(results: EnsembleResult[]): {
  summary: string;
  rankings: Array<{
    strategy: string;
    convergence: number;
    energy: number;
    diversity: number;
    score: number; // weighted combination
  }>;
} {
  const comparison = compareEnsembleResults(results);
  
  const rankings = results.map(result => {
    const conv = result.metrics?.convergence ?? 0;
    const energy = result.metrics?.energy ?? 0;
    const div = result.metrics?.diversity ?? 0;
    
    // Weighted score: 40% convergence, 30% energy, 30% diversity
    const score = conv * 0.4 + energy * 0.3 + div * 0.3;
    
    return {
      strategy: result.strategy,
      convergence: conv,
      energy,
      diversity: div,
      score
    };
  }).sort((a, b) => b.score - a.score);

  const summary = `Ensemble analysis: ${comparison.bestConvergence} leads convergence, ${comparison.bestEnergy} leads energy, ${comparison.bestDiversity} leads diversity. Divergence: ${comparison.divergence.toFixed(3)}`;

  return { summary, rankings };
}
