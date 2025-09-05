import { evaluateExpression } from "./math-eval";
/**
 * Runs a calculation job through the TGO kernel system
 * @param job - Job with expression to evaluate
 * @returns Promise resolving to calculation result
 */
export async function runCalc(job) {
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
    }
    catch (error) {
        throw new Error(`Calc kernel error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
