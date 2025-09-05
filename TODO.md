# TODO — Proxy Operator Roadmap

## Math / Analytics
- [ ] Fractal address coverage: estimate coverage density per window (unique motifs / total motifs).
- [ ] Motif convergence metric: Jaccard similarity of motif sets across levels; declare convergence if J > τ (default τ=0.6).
- [ ] Stability index S: rolling average of (converged ? 1 : 0) over last K windows; expose S in report.
- [ ] Optional: approximate fractal dimension D via box-counting on level-0 binary map; quick downlink to reporter.

## Vision Kernel
- [ ] Implement Sobel gradients and 8-bin orientation histogram per grid cell; compress to 64-d vector.
- [ ] Fast local variance heatmap to track "activity"; used to bias sampling plan.

## Viewport Strategies
- [ ] Energy-biased sampler: duplicate sampling for high-variance cells; compare report quality vs uniform.
- [ ] Address-aware sampler: inject glyph-core `triIndexAt` projections to align visual quadrants with addresses.

## Operator Loop
- [ ] Adaptive report cadence: if energy low, slow to 500ms; if high, 120ms.
- [ ] Backpressure metrics: count dropped frames, expose in report meta.

## Reporter
- [ ] Add "evidence bullets" with top-2 motifs, their run-length (RLE) persistence across last N windows, and simple confidence ∈ [0,1].
- [ ] Serialize reports as line-delimited JSON (LDJSON) and enable export button in viewer.

## Viewer UX
- [ ] Sparkline of S (stability) last 30 windows.
- [ ] Panel to compare two strategies side-by-side (uniform vs energy-biased).

## Tests
- [ ] Property test: identical frames → identical motifs.
- [ ] Fuzz test: random noise frames → low convergence rate by design.
