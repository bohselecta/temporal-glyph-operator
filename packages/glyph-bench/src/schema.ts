import { hostname, platform, arch, cpus } from "node:os";

/**
 * Individual benchmark sample
 */
export interface BenchSample {
  /** CPU computation time in milliseconds */
  t_cpu_ms: number;
  /** TGO end-to-end time in milliseconds */
  t_tgo_e2e_ms: number;
  /** Speedup ratio (CPU / TGO), if both successful */
  speedup?: number;
  /** Sample timestamp */
  ts: number;
  /** CPU computation result (for verification) */
  cpu_result?: number;
  /** TGO computation result (for verification) */
  tgo_result?: number;
  /** CPU error message, if any */
  cpu_error?: string;
  /** TGO error message, if any */
  tgo_error?: string;
}

/**
 * Environment information
 */
export interface BenchEnvironment {
  /** Hostname of the machine */
  hostname: string;
  /** Operating system platform */
  platform: string;
  /** CPU architecture */
  arch: string;
  /** CPU model name */
  cpu_model: string;
  /** Number of logical CPU cores */
  logical_cores: number;
  /** Node.js version */
  node_version: string;
  /** Benchmark timestamp */
  benchmark_ts: number;
}

/**
 * Benchmark statistics
 */
export interface BenchStats {
  /** Number of samples */
  count: number;
  /** Mean value */
  mean: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** 95th percentile */
  p95: number;
  /** Standard deviation */
  std_dev: number;
}

/**
 * Complete benchmark record
 */
export interface BenchRecord {
  /** Expression that was benchmarked */
  expr: string;
  /** Number of benchmark runs */
  runs: number;
  /** Number of warmup runs */
  warmup: number;
  /** Individual samples */
  samples: BenchSample[];
  /** CPU timing statistics */
  cpu_stats: BenchStats;
  /** TGO timing statistics */
  tgo_stats: BenchStats;
  /** Environment information */
  env: BenchEnvironment;
  /** Benchmark metadata */
  meta: {
    /** Schema version */
    schema_version: string;
    /** Benchmark tool version */
    tool_version: string;
    /** Total benchmark duration in milliseconds */
    total_duration_ms: number;
  };
}

/**
 * Capture current environment information
 */
export function captureEnvironment(): BenchEnvironment {
  const cpu_info = cpus();
  const cpu_model = cpu_info.length > 0 ? (cpu_info[0]?.model ?? "Unknown CPU") : "Unknown CPU";
  
  return {
    hostname: hostname(),
    platform: platform(),
    arch: arch(),
    cpu_model,
    logical_cores: cpu_info.length,
    node_version: process.version,
    benchmark_ts: Date.now()
  };
}
