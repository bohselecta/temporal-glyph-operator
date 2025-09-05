# Temporal Glyph Operator Architecture

## Overview

The Temporal Glyph Operator (TGO) is a sophisticated research platform for fractal analysis featuring multi-viewport observation, motif convergence tracking, and evidence-based intelligence. It operates as both a research tool and a dataflow computer.

## Core Architecture

### Monorepo Structure
- **`packages/`** - Pure computation packages (no DOM access)
- **`apps/viewer`** - Next.js web interface (only package that touches browser APIs)
- **Strict TypeScript** - No `any` types, comprehensive testing, performance budgets

### Key Packages
- **`@glyph/core`** - Pure math/PRNG, monoids, exact arithmetic helpers
- **`@glyph/vision-kernel`** - Observers, pHash, convergence metrics
- **`@glyph/compute-kernels`** - Monte Carlo, FFT, MatMul, reductions
- **`@glyph/planner`** - Natural language → FEG planner
- **`@glyph/virtual-tape`** - Procedural scratchpad layer
- **`@glyph/glyph-drive`** - Császár geometry, addressing, payload store
- **`@glyph/address-mapper`** - jobId ⇄ (face, tri, depth) mapping
- **`@glyph/adapters`** - FEG→Drive pinning adapter

## Data Flow

```
User Input → Planner → FEG → Kernels → Adapter → Address Mapper → Glyph Drive → Observer → UI
```

## Diagrams

### C4 Container Diagram
See [C4 Container Diagram](diagrams/c4-containers.md) for the high-level system architecture.

### Pinning Sequence
See [Pinning Sequence](diagrams/pinning-sequence.md) for the detailed flow of how computation results get pinned to the torus.

## Performance Budgets

See [Performance Budgets](perf.md) for detailed performance requirements and measurement criteria.

## Development Guidelines

### Purity Rules
- Packages in `packages/` must be DOM-free and portable
- Only `apps/viewer` may access browser APIs
- All public APIs must be typed and documented with TSDoc

### Performance Requirements
- `buildPyramid(levels≤6)` over 512×512 must complete < 8ms average
- Proxy report loop must not allocate > 2MB per second sustained
- AddressMapper.locate: P95 < 0.3ms
- Drive.attachPayload: P95 < 1ms

### Testing
- All PRs must add or update tests covering new code paths
- Maintain ≥80% statement coverage in packages
- Performance budgets enforced via CI

## Geometry Status

**Current Implementation:** The viewer now renders the exact Császár polyhedron (7 vertices, 14 triangular faces) with K₇ connectivity. This provides the mathematically precise torus topology with Möbius triangulation. The implementation uses classical vertex coordinates and maintains full compatibility with the addressing hierarchy and camera focus system.

### Deterministic Replay & LDJSON Import
- Session header includes a determinism block with planner/mapper versions and geometry summary.
- Exports stream `pinned` events with `addr` and payload; importer reattaches pins to Drive.
- CI guards ensure encodePathToIndex logic remains consistent (address→face index mapping).

### Fractal Tape (M4)
- Values are JSON-packed, converted to base-4 glyph digits, and optionally shuffled by a deterministic PRNG keyed by (seed, base address, tick, length).  
- The resulting digits are appended as `:c=d` segments, increasing the address depth.
- Decoding reverses the shuffle and unpacks JSON.
- The tape is pure; Drive persistence happens via the finalize→tape adapter.

## Future Roadmap

### Phase 1: Geometry & Camera (M2) ✅
- ✅ Implement exact Császár polyhedron (7 vertices, 14 faces, K₇ connectivity)
- ✅ Add `focusAddr(addr)` camera control
- ✅ Throughput-based emissive overlay
- ✅ Loop subdivision for hierarchical addressing

### Phase 2: Heatmap & Telemetry (M3) ✅
- ✅ Live heatmap visualization with color ramp (blue→yellow→red)
- ✅ Per-face heat overlay with decay
- ✅ Deterministic replay capabilities with LDJSON import
- ✅ Hotkeys for navigation (J, [, ])
- ✅ Path-to-index encoding for subdivision levels

### Phase 3: Fractal Tape Backend (M4) ✅
- ✅ Deterministic, geometry-addressable tape encoding
- ✅ Base-4 glyph path extension of Császár addressing
- ✅ JSON value encoding with deterministic shuffle
- ✅ Tape adapter binding finalize→tape→drive→observer
- ✅ Comprehensive roundtrip and base4 tests

### Phase 3: Split Readiness (M5)
- API freeze and documentation
- Extract Glyph Drive to separate repository
- Versioned API contracts
