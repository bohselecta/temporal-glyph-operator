# Concrete Issues for Next Phase

## M2 - Geometry & Camera

### Issue 1: feat(viewer): implement Császár geometry + Loop subdivision
**Goal**: Replace in-memory drive faces with true 7-vertex Császár polyhedron, subdividable.

**Acceptance Criteria**:
- [ ] Geometry renders 14 faces at L0, 56 at L1, 224 at L2
- [ ] `addr → face` mapping available for overlay
- [ ] Unit tests cover adjacency + K7 connectivity

**Labels**: `feature`, `good-first-issue`

### Issue 2: feat(viewer): camera focus for address navigation
**Goal**: Add `focusAddr(addr)` and wire from PinnedDrawer onJump.

**Acceptance Criteria**:
- [ ] Clicking an addr animates camera to the face centroid
- [ ] Visual highlight persists 2s with decay

**Labels**: `feature`

## M3 - Heatmap & Telemetry

### Issue 3: feat(overlay): throughput-driven heatmap
**Goal**: Emissive intensity scales with recent throughput; decays over time.

**Acceptance Criteria**:
- [ ] Live update ≤250ms cadence
- [ ] O(1) update per event; no frame jank

**Labels**: `feature`, `performance`

### Issue 4: feat(import): LDJSON→pins reattach
**Goal**: Load a prior session file; re-pin payloads to drive.

**Acceptance Criteria**:
- [ ] Import button; progress & success toast
- [ ] Recreated pins match original addrs

**Labels**: `feature`

## M4 - Determinism & Import

### Issue 5: perf(address-mapper): hierarchical addressing
**Goal**: Replace hash mapper with hierarchical (parent→child) scheme.

**Acceptance Criteria**:
- [ ] Deterministic across runs given same seed
- [ ] CI P95 <0.3ms (10k locates)

**Labels**: `performance`, `tech-debt`

### Issue 6: docs(architecture): embed diagrams + First Run guide
**Goal**: Architecture diagrams linked in ARCHITECTURE.md; add First Run.

**Acceptance Criteria**:
- [ ] Mermaid renders on GitHub
- [ ] README quickstart verified

**Labels**: `tech-debt`, `good-first-issue`

## Milestones

- **M1 - Pinning Loop** ✅ DONE
- **M2 - Geometry & Camera** (Issues 1-2)
- **M3 - Heatmap & Telemetry** (Issues 3-4)  
- **M4 - Determinism & Import** (Issues 5-6)
- **M5 - Split Readiness** (Future)
