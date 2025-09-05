/**
 * Calculator kernel for TGO planner
 * Evaluates mathematical expressions safely using shunting-yard algorithm
 */
export interface CalcJob {
    jobId: string;
    args: {
        expr: string;
    };
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
export declare function runCalc(job: CalcJob): Promise<CalcResult>;
//# sourceMappingURL=calc.d.ts.map