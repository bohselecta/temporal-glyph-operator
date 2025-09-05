#!/bin/bash

# GitHub Issues & Milestones Creation Script
# Run: bash scripts/create-github-issues.sh your-org/your-repo

REPO=${1:-"your-org/glyph-operator"}

echo "🚀 Creating milestones and issues for $REPO..."

# Create Milestones
echo "📋 Creating milestones..."
gh api repos/$REPO/milestones -f title="Geometry + Heatmap" -f description="Császár geometry, camera focus, heatmap visualization"
gh api repos/$REPO/milestones -f title="Determinism & CI" -f description="Snapshot testing, performance benchmarks, CI/CD"
gh api repos/$REPO/milestones -f title="Docs & Developer UX" -f description="Documentation, guides, navigation hotkeys"
gh api repos/$REPO/milestones -f title="Repo Split Prep" -f description="API stabilization, repository separation preparation"

# Create Labels
echo "🏷️ Creating labels..."
gh label create geometry --color 1f77b4 -R $REPO --description "Geometry and visualization features" || true
gh label create determinism --color 2ca02c -R $REPO --description "Testing and performance" || true
gh label create docs --color 9467bd -R $REPO --description "Documentation and developer experience" || true
gh label create split --color 8c564b -R $REPO --description "Repository preparation" || true

# Get milestone numbers
GEOM_MILESTONE=$(gh api repos/$REPO/milestones | jq '.[] | select(.title=="Geometry + Heatmap") | .number')
DETERM_MILESTONE=$(gh api repos/$REPO/milestones | jq '.[] | select(.title=="Determinism & CI") | .number')
DOCS_MILESTONE=$(gh api repos/$REPO/milestones | jq '.[] | select(.title=="Docs & Developer UX") | .number')
SPLIT_MILESTONE=$(gh api repos/$REPO/milestones | jq '.[] | select(.title=="Repo Split Prep") | .number')

# Create Issues
echo "📝 Creating issues..."

# Geometry + Heatmap
gh issue create -R $REPO \
  -t "feat(drive): Császár geometry implementation" \
  -b "Implement torus with Loop subdivision, export addressable faces." \
  -l geometry \
  -m $GEOM_MILESTONE

gh issue create -R $REPO \
  -t "feat(viewer): camera focus API" \
  -b "Add focusAddr(addr) and hook to PinnedDrawer." \
  -l geometry \
  -m $GEOM_MILESTONE

gh issue create -R $REPO \
  -t "feat(viewer): heatmap ramp" \
  -b "Color ramp emissive intensity (blue→yellow→red) based on throughput." \
  -l geometry \
  -m $GEOM_MILESTONE

# Determinism & CI
gh issue create -R $REPO \
  -t "test(repro): determinism snapshots" \
  -b "Snapshot planner normalization + RNG seeds; add replay tests." \
  -l determinism \
  -m $DETERM_MILESTONE

gh issue create -R $REPO \
  -t "chore(ci): tighten perf benchmarks" \
  -b "P95 <0.3ms locate; P95 <1ms attachPayload; fail PRs if slower." \
  -l determinism \
  -m $DETERM_MILESTONE

# Docs & Developer UX
gh issue create -R $REPO \
  -t "docs: First Run guide" \
  -b "Step-by-step demo instructions + example commands." \
  -l docs \
  -m $DOCS_MILESTONE

gh issue create -R $REPO \
  -t "docs: architecture diagrams embed" \
  -b "Embed C4 + pinning sequence in ARCHITECTURE.md." \
  -l docs \
  -m $DOCS_MILESTONE

gh issue create -R $REPO \
  -t "dx(viewer): pinned navigation hotkeys" \
  -b "J last pin; [ / ] prev/next pin." \
  -l docs \
  -m $DOCS_MILESTONE

# Repo Split Prep
gh issue create -R $REPO \
  -t "refactor(drive): API stabilization" \
  -b "Finalize public interfaces for Drive + Mapper." \
  -l split \
  -m $SPLIT_MILESTONE

gh issue create -R $REPO \
  -t "chore(repo): prepare split script" \
  -b "Script/docs to extract @glyph/glyph-drive & @glyph/address-mapper." \
  -l split \
  -m $SPLIT_MILESTONE

echo "✅ All milestones and issues created!"
echo "🔗 View at: https://github.com/$REPO/issues"
