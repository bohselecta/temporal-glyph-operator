# AGENTS — Temporal Glyph Operator (Scrupulous Edition)

## Roles
- **Architect-Agent**: Maintains cross-package invariants, enforces `.cursorrules`, shapes stable APIs.
- **Vision-Agent**: Owns image pyramid, perceptual hash, gradients; keeps perf under budget.
- **Viewport-Agent**: Designs sampling strategies (uniform, energy-biased, address-aware).
- **Operator-Agent**: Runs the TGO loop, ring buffer, backpressure, cadence adaptation.
- **Reporter-Agent**: Schemas for observations/reports; convergence, stability S, Jaccard, fractal dimension.
- **Viewer-Agent**: Next.js UI; canvas ownership; zero data logic besides rendering & export.

## Ground Truth
- Frames are authoritative; no recomputation from hidden state.
- `packages/*` are UI-agnostic, deterministic, and side-effect free.

## Definition of Done (per PR)
1. Types + TSDoc updated and exported.
2. Tests added/updated; `npm run test` passes; coverage ≥80%.
3. Perf budgets met (see `.cursorrules` §4) with numbers in PR summary.
4. No new deps unless policy §5 satisfied; include license.
5. Viewer demo still runs (`npm run dev`) and displays live reports.

## Guardrails
- Avoid "quantum" terminology in code; describe mechanisms: multi-viewport sampling, motif convergence, compressed address space.
- Parameterize sizes; don't assume 512×512.
- Backpressure: if frame rate > report rate, analyze **latest frame only** (ring buffer already in place).

## Roadmap Tasks
- **Vision-Agent**
  - [ ] Add gradient orientation histograms (tiny HOG) and expose as optional features.
  - [ ] SIMD-friendly Sobel and local variance maps.
- **Viewport-Agent**
  - [ ] Energy-biased sampler; compare report quality vs uniform.
  - [ ] Address-aware sampler using `triIndexAt` projections.
- **Operator-Agent**
  - [ ] Adaptive cadence: slow to 500ms on low energy, 120ms on high.
  - [ ] Telemetry hooks: dropped frames, GC pauses.
- **Reporter-Agent**
  - [ ] Evidence bullets (top motifs, run-length persistence, confidence 0..1).
  - [ ] Box-counting D confidence interval from linear fit residuals.
- **Viewer-Agent**
  - [ ] Sparkline for stability S; download LDJSON (implemented); add CSV export.

## Review Checklist
- [ ] Packages remain pure (no DOM/console/timers).
- [ ] APIs stable; GUI compiles without changes.
- [ ] Edge cases covered (tiny frames, odd widths, `levels=1`).
- [ ] Perf measured and attached.
