# GlyphBench — How to Run (Old Machines Welcome)

## Install once
```bash
pnpm -w add -D typescript
# if needed, wire package in the workspace: packages/glyph-bench + apps/bench
```

## Run a quick benchmark
```bash
pnpm -C apps/bench start -- "2^32" --runs 10 --warmup 1
```

Outputs to `./bench-out/`:
- `calc_*.ldjson` → full record (great for TGO import/replay)
- `calc_*.csv` → tidy rows per sample

## Example Usage

### Basic benchmark
```bash
node apps/bench/cli.js "2^32"
```

### Statistical analysis (recommended)
```bash
node apps/bench/cli.js "(1+2)*3^4/5-6" --runs 10 --warmup 2
```

### Stress test expressions
```bash
# Power operations
node apps/bench/cli.js "2^64" --runs 5

# Complex functions  
node apps/bench/cli.js "sin(cos(tan(3.14159/4)))" --runs 20

# Scientific notation
node apps/bench/cli.js "1e6*(sqrt(2)^2-2)" --runs 15
```

## Recommended methodology

### Power & Thermals
- **Power plan**: Windows → High performance; plug in laptop
- **Thermals**: First run after boot can be slower; do 1-2 warmup runs
- **Background noise**: Close browsers, updaters, and other resource-heavy apps

### Repeatability
- **Pin cores (optional)**: `start /affinity 1 node apps/bench/cli.js "2^32"` to stick to CPU0
- **Sample size**: Keep `--runs` ≥ 10 for stable mean/p95 statistics
- **Environment**: Auto-recorded (hostname, CPU model, Node version, etc.)

### Windows-specific tips
```bash
# Pin to specific CPU core (reduces variance)
start /affinity 1 node apps/bench/cli.js "2^32" --runs 20

# Run with high priority
start /high node apps/bench/cli.js "sqrt(16)+abs(-5)" --runs 15

# Batch multiple expressions
for %e in ("2^32" "sin(3.14159/2)" "sqrt(16)+abs(-5)") do (
    node apps/bench/cli.js %e --runs 10 --warmup 1
)
```

## Output Format

### LDJSON Record
```json
{
  "expr": "2^32",
  "runs": 10,
  "warmup": 1,
  "samples": [
    {
      "t_cpu_ms": 0.023,
      "t_tgo_e2e_ms": 0.156,
      "speedup": 0.147,
      "ts": 1699123456789,
      "cpu_result": 4294967296,
      "tgo_result": 4294967296
    }
  ],
  "cpu_stats": {
    "count": 10,
    "mean": 0.025,
    "min": 0.021,
    "max": 0.033,
    "p95": 0.031,
    "std_dev": 0.004
  },
  "tgo_stats": {
    "count": 10,
    "mean": 0.158,
    "min": 0.142,
    "max": 0.178,
    "p95": 0.172,
    "std_dev": 0.012
  },
  "env": {
    "hostname": "DESKTOP-ABC123",
    "platform": "win32",
    "arch": "x64",
    "cpu_model": "Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz",
    "logical_cores": 12,
    "node_version": "v20.10.0",
    "benchmark_ts": 1699123456789
  }
}
```

### CSV Export (per sample)
```csv
i,expr,cpu_ms,tgo_e2e_ms,speedup,ts,host,cpu
0,"2^32",0.023,0.156,0.147,1699123456789,DESKTOP-ABC123,"Intel(R) Core(TM) i7-8700K"
1,"2^32",0.024,0.151,0.159,1699123456790,DESKTOP-ABC123,"Intel(R) Core(TM) i7-8700K"
```

## Feeding into TGO

### Import via existing UI
- Drop the `.ldjson` file into your existing Import UI
- View heat maps and timelines in the TGO interface
- Analyze temporal patterns and performance trends

### Programmatic integration
```javascript
// Emit pinned events from Node observer shim
const benchData = JSON.parse(fs.readFileSync('bench-out/calc_*.ldjson'));
observer.emit('pinned', {
  jobId: 'bench-import',
  payload: {
    result: benchData.cpu_stats.mean,
    meta: {
      kernel: 'calc-bench',
      strategy: 'cpu-baseline',
      samples: benchData.samples.length,
      ...benchData.env
    }
  }
});
```

## Adapters (future extensions)

### Hyperfine integration
```bash
# Compare Node vs external binaries
hyperfine --export-json hyperfine.json 'node -e "console.log(Math.pow(2,32))"'
# Convert hyperfine JSON → GlyphBench schema
```

### External benchmarks
```bash
# Geekbench/PassMark scores
node apps/bench/adapters/geekbench.js --import-score 1234
# Store under meta.external_scores
```

### Worker distribution
```bash
# Enqueue jobs across remote workers
node apps/bench/adapters/worker-pool.js "2^32" --workers 4
# Compare locality vs distribution overhead
```

## Troubleshooting

### Common issues
- **Permission errors**: Run as Administrator if needed for high-priority processes
- **Module not found**: Ensure `@glyph/kernels` package is built (`pnpm -w build`)
- **Out of memory**: Reduce `--runs` for very complex expressions

### Performance tips
- Use `--warmup 2` minimum for consistent results
- Pin to P-cores on hybrid CPUs: `start /affinity 0x55 node cli.js ...`
- Monitor thermal throttling during long benchmark runs

## Why GlyphBench?

### Designed for your stack
- **Native TGO integration**: Uses your real `@glyph/kernels/calc`
- **Temporal-ready**: LDJSON format matches your existing import pipeline
- **Old machine friendly**: Pure Node.js, no heavy dependencies
- **Windows optimized**: PowerShell-friendly commands and paths

### Rigorous methodology  
- **Statistical analysis**: Mean, min, max, p95, standard deviation
- **Environment capture**: Full system fingerprinting for reproducibility
- **Warmup handling**: Eliminates JIT/thermal cold-start effects
- **Sample-level data**: Individual timing measurements for distribution analysis

### Extensible design
- **Adapter pattern**: Easy integration with external tools
- **Schema-based**: Consistent data format across all benchmark types
- **CSV + LDJSON**: Both human-readable and machine-processable outputs

Run it on any machine you own, aggregate the CSVs, and watch the temporal patterns emerge in your TGO interface!
