export interface ExperimentSpec {
  kernel: string;
  params: Array<{
    name: string;
    values: any[];
  }>;
  repeats?: number;
}

export interface ExperimentJob {
  jobId: string;
  kernel: string;
  args: Record<string, any>;
}

/**
 * Generate a grid of experiment jobs from a specification
 */
export function generateGrid(spec: ExperimentSpec): ExperimentJob[] {
  const jobs: ExperimentJob[] = [];
  const repeats = spec.repeats || 1;
  
  // Generate all combinations of parameter values
  const combinations = generateCombinations(spec.params);
  
  for (let repeat = 0; repeat < repeats; repeat++) {
    for (const combo of combinations) {
      const jobId = `${spec.kernel}-${repeat}-${combo.map(([k, v]) => `${k}=${v}`).join('-')}`;
      jobs.push({
        jobId,
        kernel: spec.kernel,
        args: Object.fromEntries(combo)
      });
    }
  }
  
  return jobs;
}

function generateCombinations(params: Array<{ name: string; values: any[] }>): any[][][] {
  if (params.length === 0) return [[]];
  
  const [first, ...rest] = params;
  const restCombos = generateCombinations(rest);
  const result: any[][][] = [];
  
  for (const value of first.values) {
    for (const combo of restCombos) {
      result.push([[first.name, value], ...combo]);
    }
  }
  
  return result;
}
