import { describe, it, expect } from "vitest";
import { bucketize, divergenceMSE, pairwiseDivergences } from "../src/experiments/divergence";

describe("divergence", () => {
  it("bucketize + mse", () => {
    const now = Date.now();
    const runs = [
      { t: now, strategy: "uniform", value: 1 },
      { t: now+10, strategy: "energy", value: 3 },
      { t: now+2000, strategy: "uniform", value: 2 },
      { t: now+2010, strategy: "energy", value: 2 },
    ];
    const series = bucketize(runs, 2000);
    const sU = series.find(s=>s.strategy==="uniform")!;
    const sE = series.find(s=>s.strategy==="energy")!;
    const d = divergenceMSE(sE, sU);
    expect(d.length).toBeGreaterThan(0);
    expect(d.every(x=>Number.isFinite(x.d))).toBe(true);
    const pw = pairwiseDivergences(series, "uniform");
    expect(Object.keys(pw)).toContain("energy");
  });
});
