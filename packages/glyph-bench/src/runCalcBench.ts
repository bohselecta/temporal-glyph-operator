import { runCalc, type CalcJob } from "@glyph/kernels";
import { evaluateExpression } from "./eval-local";
import { 
  type BenchRecord, 
  type BenchSample, 
  captureEnvironment 
} from "./schema";
import { calculateStats, calculateSpeedup, sleep } from "./util";

/**
 * Run a single benchmark iteration
 */
async function runSingleBench(expression: string): Promise<BenchSample> {
  const sample: BenchSample = {
    t_cpu_ms: 0,
    t_tgo_e2e_ms: 0,
    ts: Date.now()
  };

  // CPU benchmark
  try {
    const cpuStart = performance.now();
    const cpuResult = evaluateExpression(expression);
    const cpuEnd = performance.now();
    
    sample.t_cpu_ms = cpuEnd - cpuStart;
    sample.cpu_result = cpuResult;
  } catch (error) {
    sample.cpu_error = error instanceof Error ? error.message : "Unknown CPU error";
  }

  // TGO benchmark (end-to-end including kernel overhead)
  try {
    const tgoStart = performance.now();
    
    const calcJob: CalcJob = {
      jobId: `bench-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      args: { expr: expression }
    };
    
    const tgoResult = await runCalc(calcJob);
    const tgoEnd = performance.now();
    
    sample.t_tgo_e2e_ms = tgoEnd - tgoStart;
    sample.tgo_result = tgoResult.result;
  } catch (error) {
    sample.tgo_error = error instanceof Error ? error.message : "Unknown TGO error";
  }

  // Calculate speedup if both succeeded
  if (sample.t_cpu_ms > 0 && sample.t_tgo_e2e_ms > 0) {
    const speedup = calculateSpeedup(sample.t_cpu_ms, sample.t_tgo_e2e_ms);
    if (speedup !== undefined) {
      sample.speedup = speedup;
    }
  }

  return sample;
}

/**
 * Run a complete benchmark suite for a mathematical expression
 * 
 * @param expression - Mathematical expression to benchmark
 * @param runs - Number of benchmark runs (default: 5)
 * @param warmup - Number of warmup runs (default: 1)
 * @returns Complete benchmark record
 */
export async function runCalcBench(
  expression: string, 
  runs: number = 5, 
  warmup: number = 1
): Promise<BenchRecord> {
  const benchStart = Date.now();
  const env = captureEnvironment();
  
  console.log(`🔥 Warming up (${warmup} runs)...`);
  
  // Warmup runs (not recorded)
  for (let i = 0; i < warmup; i++) {
    await runSingleBench(expression);
    await sleep(10); // Small delay between runs
  }
  
  console.log(`📊 Running benchmark (${runs} runs)...`);
  
  // Actual benchmark runs
  const samples: BenchSample[] = [];
  for (let i = 0; i < runs; i++) {
    const sample = await runSingleBench(expression);
    samples.push(sample);
    
    // Progress indicator
    const progress = ((i + 1) / runs * 100).toFixed(0);
    process.stdout.write(`\r  Progress: ${progress}% (${i + 1}/${runs})`);
    
    await sleep(10); // Small delay between runs
  }
  
  console.log("\n✅ Benchmark complete!");
  
  // Calculate statistics
  const cpuTimes = samples
    .filter(s => s.t_cpu_ms > 0)
    .map(s => s.t_cpu_ms);
  
  const tgoTimes = samples
    .filter(s => s.t_tgo_e2e_ms > 0)
    .map(s => s.t_tgo_e2e_ms);
  
  const cpu_stats = calculateStats(cpuTimes);
  const tgo_stats = calculateStats(tgoTimes);
  
  const benchEnd = Date.now();
  
  const record: BenchRecord = {
    expr: expression,
    runs,
    warmup,
    samples,
    cpu_stats,
    tgo_stats,
    env,
    meta: {
      schema_version: "1.0.0",
      tool_version: "0.1.0",
      total_duration_ms: benchEnd - benchStart
    }
  };

  return record;
}
