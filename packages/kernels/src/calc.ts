import { evaluateExpression } from "./math-eval";

/**
 * Calculator kernel for TGO planner
 * Evaluates mathematical expressions safely using shunting-yard algorithm
 */
export interface CalcJob {
  jobId: string;
  args: { expr: string };
}

export interface CalcResult {
  result: number;
  expression: string;
  meta: {
    kernel: string;
    strategy: string;
    timestamp: number;
  };
}

/**
 * Runs a calculation job through the TGO kernel system
 * @param job - Job with expression to evaluate
 * @returns Promise resolving to calculation result
 */
export async function runCalc(job: CalcJob): Promise<CalcResult> {
  const { expr } = job.args || { expr: "" };
  
  if (!expr || typeof expr !== 'string') {
    throw new Error('Invalid expression: must be a non-empty string');
  }

  try {
    const result = evaluateExpression(expr.trim());
    
    return {
      result,
      expression: expr,
      meta: {
        kernel: 'calc',
        strategy: 'tgo-kernel',
        timestamp: Date.now()
      }
    };
  } catch (error) {
    throw new Error(`Calc kernel error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
