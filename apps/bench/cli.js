#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { hostname, platform, arch, cpus } from "node:os";
import { performance } from "node:perf_hooks";

// Simple math evaluator (inline for portability)
function evaluateExpression(expression) {
  try {
    // For demo purposes, use a simple eval with basic safety checks
    // In production, this would use the full shunting-yard implementation
    const sanitized = expression.replace(/[^0-9+\-*/.^()\s]/g, '');
    if (sanitized !== expression) {
      throw new Error('Invalid characters in expression');
    }
    
    // Replace ^ with ** for JavaScript power operator
    const jsExpr = sanitized.replace(/\^/g, '**');
    
    // Simple eval for basic expressions (demo only)
    const result = eval(jsExpr);
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    return result;
  } catch (error) {
    throw new Error(`Math evaluation error: ${error.message}`);
  }
}

// Mock TGO kernel for demo
async function runCalc(calcJob) {
  const result = evaluateExpression(calcJob.args.expr);
  return {
    result,
    expression: calcJob.args.expr,
    meta: {
      kernel: 'calc',
      strategy: 'tgo-kernel',
      timestamp: Date.now()
    }
  };
}

// Simple argument parser
function parseArgs(argv) {
  const out = { runs: 5, warmup: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--runs") out.runs = Number(argv[++i]);
    else if (a === "--warmup") out.warmup = Number(argv[++i]);
    else if (!out.expr) out.expr = a;
  }
  if (!out.expr) {
    console.error("Usage: node cli.js <expr> [--runs N] [--warmup W]");
    process.exit(1);
  }
  return out;
}

// Calculate statistics
function calculateStats(values) {
  if (values.length === 0) {
    return { count: 0, mean: 0, min: 0, max: 0, p95: 0, std_dev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const mean = values.reduce((sum, val) => sum + val, 0) / count;
  const min = sorted[0];
  const max = sorted[count - 1];
  
  const p95_index = Math.ceil(count * 0.95) - 1;
  const p95 = sorted[Math.min(p95_index, count - 1)];
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
  const std_dev = Math.sqrt(variance);

  return { count, mean, min, max, p95, std_dev };
}

// Convert to CSV
function toCSV(rows) {
  if (rows.length === 0) return "";
  
  const headers = Object.keys(rows[0]);
  const csvHeaders = headers.join(",");
  
  const csvRows = rows.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\\n"))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(",");
  });
  
  return [csvHeaders, ...csvRows].join("\n");
}

// Capture environment
function captureEnvironment() {
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

// Run single benchmark
async function runSingleBench(expression) {
  const sample = {
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
    sample.cpu_error = error.message;
  }

  // TGO benchmark
  try {
    const tgoStart = performance.now();
    
    const calcJob = {
      jobId: `bench-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      args: { expr: expression }
    };
    
    const tgoResult = await runCalc(calcJob);
    const tgoEnd = performance.now();
    
    sample.t_tgo_e2e_ms = tgoEnd - tgoStart;
    sample.tgo_result = tgoResult.result;
  } catch (error) {
    sample.tgo_error = error.message;
  }

  // Calculate speedup
  if (sample.t_cpu_ms > 0 && sample.t_tgo_e2e_ms > 0) {
    sample.speedup = sample.t_cpu_ms / sample.t_tgo_e2e_ms;
  }

  return sample;
}

// Main benchmark function
async function runCalcBench(expression, runs = 5, warmup = 1) {
  const benchStart = Date.now();
  const env = captureEnvironment();
  
  console.log(`🔥 Warming up (${warmup} runs)...`);
  
  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    await runSingleBench(expression);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(`📊 Running benchmark (${runs} runs)...`);
  
  // Actual benchmark runs
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const sample = await runSingleBench(expression);
    samples.push(sample);
    
    const progress = ((i + 1) / runs * 100).toFixed(0);
    process.stdout.write(`\\r  Progress: ${progress}% (${i + 1}/${runs})`);
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log("\\n✅ Benchmark complete!");
  
  // Calculate statistics
  const cpuTimes = samples.filter(s => s.t_cpu_ms > 0).map(s => s.t_cpu_ms);
  const tgoTimes = samples.filter(s => s.t_tgo_e2e_ms > 0).map(s => s.t_tgo_e2e_ms);
  
  const cpu_stats = calculateStats(cpuTimes);
  const tgo_stats = calculateStats(tgoTimes);
  
  const benchEnd = Date.now();
  
  return {
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
}

// Main CLI
(async () => {
  try {
    const { expr, runs, warmup } = parseArgs(process.argv);
    const rec = await runCalcBench(expr, runs, warmup);
    
    const outDir = path.join(process.cwd(), "bench-out");
    fs.mkdirSync(outDir, { recursive: true });
    
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `calc_${ts}`;
    
    // LDJSON
    const ld = path.join(outDir, base + ".ldjson");
    fs.writeFileSync(ld, JSON.stringify(rec) + "\\n");
    
    // CSV (one row per sample)
    const rows = rec.samples.map((s, i) => ({
      i,
      expr: rec.expr,
      cpu_ms: Number(s.t_cpu_ms.toFixed(3)),
      tgo_e2e_ms: Number(s.t_tgo_e2e_ms.toFixed(3)),
      speedup: Number((s.speedup ?? 0).toFixed(3)),
      ts: s.ts,
      host: rec.env.hostname,
      cpu: rec.env.cpu_model,
    }));
    
    const csv = toCSV(rows);
    fs.writeFileSync(path.join(outDir, base + ".csv"), csv);

    console.log("\\n=== GlyphBench Result ===\\n");
    console.log(JSON.stringify(rec, null, 2));
    console.log("\\nWrote:", ld);
    
  } catch (error) {
    console.error("Benchmark failed:", error.message);
    process.exit(1);
  }
})();
