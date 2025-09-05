import type { BenchStats } from "./schema";

/**
 * Calculate statistics from an array of numbers
 */
export function calculateStats(values: number[]): BenchStats {
  if (values.length === 0) {
    return {
      count: 0,
      mean: 0,
      min: 0,
      max: 0,
      p95: 0,
      std_dev: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const mean = values.reduce((sum, val) => sum + val, 0) / count;
  const min = sorted[0] ?? 0;
  const max = sorted[count - 1] ?? 0;
  
  // Calculate 95th percentile
  const p95_index = Math.ceil(count * 0.95) - 1;
  const p95 = sorted[Math.min(p95_index, count - 1)] ?? 0;
  
  // Calculate standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
  const std_dev = Math.sqrt(variance);

  return {
    count,
    mean,
    min,
    max,
    p95,
    std_dev
  };
}

/**
 * Convert array of objects to CSV string
 */
export function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  
  const firstRow = rows[0];
  if (!firstRow) return "";
  
  const headers = Object.keys(firstRow);
  const csvHeaders = headers.join(",");
  
  const csvRows = rows.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
        // Escape CSV special characters
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(",");
  });
  
  return [csvHeaders, ...csvRows].join("\n");
}

/**
 * Format timing value with appropriate units
 */
export function formatTiming(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Calculate speedup ratio with proper handling of edge cases
 */
export function calculateSpeedup(cpuMs: number, tgoMs: number): number | undefined {
  if (cpuMs <= 0 || tgoMs <= 0) return undefined;
  return cpuMs / tgoMs;
}

/**
 * Sleep for specified milliseconds (for warmup delays)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
