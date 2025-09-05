# Strategy Lab — Quickstart

## 1. Boot the app with an Observer global:
```js
// somewhere in your viewer boot
window.__TGO_OBSERVER__ = observer;
```

## 2. Build the Strategy Lab page (development):
```bash
cd apps/viewer && pnpm dev --open --entry=src/main-strategy.tsx
```

## 3. Run sweeps from console:
```ts
import { demoSweeps } from "@glyph/planner/src/experiments/console";
await demoSweeps(async (job) => planner.submit(job));
```

## 4. Watch **Strategy Means** & **Divergence vs Baseline** update live.

> **Notes**
> - The lab reads strategy names from `payload.meta.strategy` or `payload.meta.policy`.
> - Provide a numeric `result` or an object `{ value: number }` for clean charts.
> - Bucket size defaults to 2s; adjust via `bucketMs` prop.

## Features

- **Strategy Means Chart**: Shows bucketed averages by strategy over time
- **Divergence Timeline**: MSE divergence vs selected baseline strategy
- **Live Updates**: Automatically updates as new runs are pinned
- **Interactive Controls**: Adjust bucket size and baseline strategy
- **Multiple Strategies**: Supports uniform, energy, motif, and custom strategies

## API

### Run History
```ts
import { InMemoryRunHistory, bindHistory } from "@glyph/planner/src/experiments/run-history";

const history = new InMemoryRunHistory();
bindHistory(history, observer);
```

### Divergence Analysis
```ts
import { bucketize, divergenceMSE, pairwiseDivergences } from "@glyph/planner/src/experiments/divergence";

const series = bucketize(runs, 2000);
const divergences = pairwiseDivergences(series, "uniform");
```

### Demo Sweeps
```ts
import { demoSweeps } from "@glyph/planner/src/experiments/console";

await demoSweeps(async (job) => {
  // Submit job to your planner
  await planner.submit(job);
});
```
