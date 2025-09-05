import type { ViewSample } from "@glyph/viewport-manager";
import type { EvidenceBullet } from "./evidence.js";
import { computeEvidence } from "./evidence.js";

export type Observation = {
  t: number;
  layer: number;
  level: number;
  motif: string;     // compact hash text
  signal: number;    // 0..255-ish
};

export type Report = {
  windowMs: number;
  observations: Observation[];
  summary: string;
  evidence?: EvidenceBullet[]; // optional evidence bullets
};

function bigIntToBase32(b: bigint): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
  let out = "";
  let n = b;
  for (let i=0n; i<16n; i++) { out += alphabet[Number(n & 31n)]; n >>= 5n; }
  return out;
}

export function generateReport(
  samples: ViewSample[], 
  t: number, 
  windowMs=250, 
  motifHistory: string[][] = [],
  stabilityS: number = 0
): Report {
  const observations: Observation[] = samples.map(s => ({
    t, layer: s.layer, level: s.level,
    motif: bigIntToBase32(s.hash),
    signal: Math.max(0, Math.min(255, Math.round(s.energy)))
  }));

  // tiny heuristic: count repeated motifs across levels = "convergence"
  const motifCounts = new Map<string, number>();
  observations.forEach(o => motifCounts.set(o.motif, (motifCounts.get(o.motif) ?? 0)+1));
  const top = [...motifCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2);

  const summary = top.length
    ? `Convergence motif(s): ${top.map(([m,c]) => `${m}×${c}`).join(", ")} across ${observations.length} views.`
    : `No motif convergence in ${observations.length} views.`;

  // Generate evidence bullets if we have history
  const evidence = motifHistory.length > 0 
    ? computeEvidence(top.map(([motif, count]) => ({ motif, count })), motifHistory, stabilityS)
    : [];

  return { windowMs, observations, summary, evidence };
}
