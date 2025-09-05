/**
 * Temporal Glyph Operator — Main Web Interface
 * Copyright © 2025 Hayden Lindley
 * Licensed under the Temporal Glyph Operator License (Strict Proprietary)
 */

"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Temporal Glyph Operator — Single-file web GUI demo
 * --------------------------------------------------
 * - Fractal canvas (animated Sierpinski-like field)
 * - Temporal Glyph Operator (TGO) observes frames via a FrameBus
 * - Multi-resolution sampling (image pyramid) + motif hashing (pHash)
 * - Metrics: convergence, stability S, gradient energy, box-counting fractal dimension
 * - Address Lens: hover the canvas to read fractal address at chosen depth
 * - Controls: levels, cadence, address depth, pause
 * - Exports: Download LDJSON of recent reports
 *
 * Notes:
 * - Pure TS/React; no external UI libs. Tailwind classes applied if available.
 * - All logic is self-contained; you can lift core classes into packages/* in Cursor.
 */

// ----------------------------- Core Types -----------------------------
type Vec = { x: number; y: number };

type Frame = {
  t: number; // ms
  layer: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray; // RGBA
  meta?: Record<string, unknown>;
};

type ViewSample = {
  layer: number;
  level: number;
  hash: bigint; // perceptual hash of that level
  energy: number; // avg |lum-128|
  grad: number; // avg gradient magnitude
};

type Observation = {
  t: number;
  layer: number;
  level: number;
  motif: string; // base32-compact of hash
  signal: number; // 0..255-ish (energy)
  grad: number;  // 0..255-ish (gradient)
};

type EvidenceBullet = {
  motif: string;
  count: number;
  persisted: number; // run-length in windows
  confidence: number; // 0..1
};

type Report = {
  t: number;
  windowMs: number;
  observations: Observation[];
  summary: string;
  metrics: {
    convergence: number; // 0..1 (share of dominant motif among levels)
    stability: number;   // rolling S, 0..1 (filled in by GUI state)
    fractalDim: number;  // ~1.5-1.9 for Sierpinski-like patterns
    energyMean: number;  // avg energy at level 0
    jaccardPrev: number; // similarity to previous window's motif set
  };
  topMotifs: { motif: string; count: number }[];
  evidence?: EvidenceBullet[];
};

// ----------------------------- Frame Bus -----------------------------
class FrameBus {
  private listeners = new Set<(f: Frame) => void>();
  emit(frame: Frame) { this.listeners.forEach((h) => h(frame)); }
  subscribe(h: (f: Frame) => void) {
    this.listeners.add(h);
    return () => this.listeners.delete(h);
  }
}

// ----------------------------- Fractal Addressing -----------------------------
const SQRT3 = Math.sqrt(3);
const A: Vec = { x: 0, y: 0 };
const B: Vec = { x: 1, y: 0 };
const C: Vec = { x: 0.5, y: SQRT3 / 2 };

function midpoint(p: Vec, q: Vec): Vec {
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}
function sign(p1: Vec, p2: Vec, p3: Vec) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}
function pointInTriangle(p: Vec, a: Vec, b: Vec, c: Vec) {
  const s1 = sign(p, a, b), s2 = sign(p, b, c), s3 = sign(p, c, a);
  const hasNeg = s1 < 0 || s2 < 0 || s3 < 0;
  const hasPos = s1 > 0 || s2 > 0 || s3 > 0;
  return !(hasNeg && hasPos);
}
/** Map normalized (x,y) inside unit triangle to address of given depth */
function triIndexAt(x: number, y: number, depth: number): string {
  let addr = "";
  let pA = A, pB = B, pC = C;
  for (let i = 0; i < depth; i++) {
    const ab = midpoint(pA, pB), bc = midpoint(pB, pC), ca = midpoint(pC, pA);
    const inA = pointInTriangle({ x, y }, pA, ab, ca);
    const inB = pointInTriangle({ x, y }, ab, pB, bc);
    const inC = pointInTriangle({ x, y }, ca, bc, pC);
    if (inA) { addr += "A"; pB = ab; pC = ca; }
    else if (inB) { addr += "B"; pA = ab; pC = bc; }
    else if (inC) { addr += "C"; pA = ca; pB = bc; }
    else break;
  }
  return addr || "∅";
}

// ----------------------------- Image Pyramid & Features -----------------------------
function buildPyramid(frame: Frame, levels = 4) {
  const out: { scale: number; width: number; height: number; data: Uint8ClampedArray }[] = [];
  let { width, height } = frame;
  let data = frame.pixels;
  out.push({ scale: 1, width, height, data });
  for (let i = 1; i < levels; i++) {
    const w2 = Math.max(1, Math.floor(width / 2));
    const h2 = Math.max(1, Math.floor(height / 2));
    const d2 = new Uint8ClampedArray(w2 * h2 * 4);
    // Box filter downscale 2x
    for (let y = 0; y < h2; y++) {
      for (let x = 0; x < w2; x++) {
        const xi = x * 2, yi = y * 2;
        const acc: [number, number, number, number] = [0, 0, 0, 0];
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const iSrc = ((yi + dy) * width + (xi + dx)) * 4;
          if (iSrc + 3 < data.length) {
            acc[0] += data[iSrc] ?? 0; acc[1] += data[iSrc + 1] ?? 0; acc[2] += data[iSrc + 2] ?? 0; acc[3] += data[iSrc + 3] ?? 0;
          }
        }
        const iDst = (y * w2 + x) * 4;
        if (iDst + 3 < d2.length) {
          d2[iDst] = acc[0] >> 2; d2[iDst + 1] = acc[1] >> 2; d2[iDst + 2] = acc[2] >> 2; d2[iDst + 3] = acc[3] >> 2;
        }
      }
    }
    out.push({ scale: 1 / Math.pow(2, i), width: w2, height: h2, data: d2 });
    data = d2; width = w2; height = h2;
  }
  return out;
}

function pHash(level: { width: number; height: number; data: Uint8ClampedArray }, grid = 8): bigint {
  const gx = Math.max(1, Math.floor(level.width / grid));
  const gy = Math.max(1, Math.floor(level.height / grid));
  let bits = 0n, bitIndex = 0n;
  for (let gyi = 0; gyi < grid; gyi++) {
    for (let gxi = 0; gxi < grid; gxi++) {
      let sum = 0, n = 0;
              for (let y = gyi * gy; y < Math.min((gyi + 1) * gy, level.height); y++) {
          for (let x = gxi * gx; x < Math.min((gxi + 1) * gx, level.width); x++) {
            const i = (y * level.width + x) * 4;
            if (i + 2 < level.data.length) {
              const lum = ((level.data[i] ?? 0) * 299 + (level.data[i + 1] ?? 0) * 587 + (level.data[i + 2] ?? 0) * 114) / 1000;
              sum += lum; n++;
            }
          }
        }
      const avg = sum / Math.max(1, n);
      bits |= (avg > 127 ? 1n : 0n) << bitIndex++;
    }
  }
  return bits;
}

function avgEnergy(level: { width: number; height: number; data: Uint8ClampedArray }): number {
  let e = 0; const len = level.data.length / 4;
  for (let i = 0; i < level.data.length; i += 4) {
    if (i + 2 < level.data.length) {
      const lum = ((level.data[i] ?? 0) * 299 + (level.data[i + 1] ?? 0) * 587 + (level.data[i + 2] ?? 0) * 114) / 1000;
      e += Math.abs(lum - 128);
    }
  }
  return e / Math.max(1, len);
}

function sobelGradient(level: { width: number; height: number; data: Uint8ClampedArray }): number {
  const { width: w, height: h, data } = level;
  let acc = 0, n = 0;
  const lumAt = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (i + 2 < data.length) {
      return ((data[i] ?? 0) * 299 + (data[i + 1] ?? 0) * 587 + (data[i + 2] ?? 0) * 114) / 1000;
    }
    return 0;
  };
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = -lumAt(x - 1, y - 1) - 2 * lumAt(x - 1, y) - lumAt(x - 1, y + 1)
               + lumAt(x + 1, y - 1) + 2 * lumAt(x + 1, y) + lumAt(x + 1, y + 1);
      const gy = -lumAt(x - 1, y - 1) - 2 * lumAt(x, y - 1) - lumAt(x + 1, y - 1)
               + lumAt(x - 1, y + 1) + 2 * lumAt(x, y + 1) + lumAt(x + 1, y + 1);
      acc += Math.hypot(gx, gy); n++;
    }
  }
  return acc / Math.max(1, n);
}

// Box-counting dimension (quick & approximate)
function boxCountDimension(level: { width: number; height: number; data: Uint8ClampedArray }, thresholds = [16, 8, 4, 2]): number {
  const { width: w, height: h, data } = level;
  const binary = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (i + 2 < data.length) {
        const lum = ((data[i] ?? 0) * 299 + (data[i + 1] ?? 0) * 587 + (data[i + 2] ?? 0) * 114) / 1000;
        binary[y * w + x] = lum > 140 ? 1 : 0; // simple threshold
      }
    }
  }
  const points: { logInvEps: number; logN: number }[] = [];
  for (const s of thresholds) {
    const bs = Math.max(1, Math.floor(Math.min(w, h) / s)); // box size
    let count = 0;
    for (let by = 0; by < h; by += bs) {
      for (let bx = 0; bx < w; bx += bs) {
        let filled = 0;
        for (let y = by; y < Math.min(by + bs, h); y++) {
          for (let x = bx; x < Math.min(bx + bs, w); x++) {
            if (binary[y * w + x]) { filled = 1; break; }
          }
          if (filled) break;
        }
        count += filled;
      }
    }
    const eps = bs / Math.max(w, h);
    points.push({ logInvEps: Math.log(1 / eps), logN: Math.log(Math.max(1, count)) });
  }
  // least squares slope
  const n = points.length;
  const sx = points.reduce((a, p) => a + p.logInvEps, 0);
  const sy = points.reduce((a, p) => a + p.logN, 0);
  const sxx = points.reduce((a, p) => a + p.logInvEps * p.logInvEps, 0);
  const sxy = points.reduce((a, p) => a + p.logInvEps * p.logN, 0);
  const denom = n * sxx - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  return Math.max(0, Math.min(2, slope));
}

// ----------------------------- Motif helpers -----------------------------
const B32 = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
function bigIntToBase32(b: bigint, digits = 16): string {
  let out = ""; let n = b;
  for (let i = 0; i < digits; i++) { out += B32[Number(n & 31n)]; n >>= 5n; }
  return out;
}

// ----------------------------- Temporal Glyph Operator -----------------------------
class TemporalGlyphOperator {
  #cfg: { 
    levels: number; 
    reportEveryMs: number; 
    ringSize: number;
    adaptiveCadence?: {
      enabled: boolean;
      fastMs: number;
      slowMs: number;
      hiEnergy: number;
      loEnergy: number;
    };
  };
  #unsubscribe: (() => void) | undefined = undefined;
  #buffer: Frame[] = [];
  #listeners = new Set<(e: { type: "report"; report: Report } | { type: "error"; error: unknown } | { type: "cadence"; ms: number; reason: "energy_high" | "energy_low" | "manual" }) => void>();
  constructor(private bus: FrameBus, cfg: Partial<{ 
    levels: number; 
    reportEveryMs: number; 
    ringSize: number;
    adaptiveCadence?: {
      enabled: boolean;
      fastMs: number;
      slowMs: number;
      hiEnergy: number;
      loEnergy: number;
    };
  }> = {}) {
    this.#cfg = { 
      levels: cfg.levels ?? 4, 
      reportEveryMs: cfg.reportEveryMs ?? 250, 
      ringSize: cfg.ringSize ?? 16,
      ...(cfg.adaptiveCadence && { adaptiveCadence: cfg.adaptiveCadence })
    };
  }
  
  setStabilityS(s: number) {
    // This is a no-op in the simplified version
    // The real implementation would be in the proxy operator
  }
  
  start() {
    if (this.#unsubscribe) return;
    let lastReport = performance.now();
    this.#unsubscribe = this.bus.subscribe((f) => {
      this.#buffer.push(f);
      if (this.#buffer.length > this.#cfg.ringSize) this.#buffer.shift();
      const now = performance.now();
      if (now - lastReport >= this.#cfg.reportEveryMs) {
        lastReport = now;
        try {
          const latest = this.#buffer[this.#buffer.length - 1];
          if (latest) {
            const report = this.#analyze(latest);
            this.#emit({ type: "report", report });
          }
        } catch (e) { this.#emit({ type: "error", error: e }); }
      }
    });
  }
  stop() { this.#unsubscribe?.(); this.#unsubscribe = undefined; }
  on(l: (e: { type: "report"; report: Report } | { type: "error"; error: unknown } | { type: "cadence"; ms: number; reason: "energy_high" | "energy_low" | "manual" }) => void) { this.#listeners.add(l); return () => this.#listeners.delete(l); }
  #emit(e: { type: "report"; report: Report } | { type: "error"; error: unknown } | { type: "cadence"; ms: number; reason: "energy_high" | "energy_low" | "manual" }) { this.#listeners.forEach((h) => h(e)); }

  #analyze(frame: Frame): Report {
    const pyr = buildPyramid(frame, this.#cfg.levels);
    const samples: ViewSample[] = pyr.map((lvl, idx) => ({
      layer: frame.layer,
      level: idx,
      hash: pHash(lvl, 8),
      energy: avgEnergy(lvl),
      grad: sobelGradient(lvl),
    }));

    const observations: Observation[] = samples.map((s) => ({
      t: frame.t,
      layer: s.layer,
      level: s.level,
      motif: bigIntToBase32(s.hash),
      signal: Math.max(0, Math.min(255, Math.round(s.energy))),
      grad: Math.max(0, Math.min(255, Math.round(s.grad / 4))), // scaled for readability
    }));

    // Convergence: dominant motif share across levels
    const counts = new Map<string, number>();
    for (const o of observations) counts.set(o.motif, (counts.get(o.motif) ?? 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0]?.[1] ?? 0;
    const convergence = observations.length ? dominant / observations.length : 0;

    // Fractal dimension from level 0
    const fractalDim = pyr[0] ? boxCountDimension(pyr[0]) : 0;

    // energy mean (level 0)
    const energyMean = samples[0]?.energy ?? 0;

    const topMotifs = sorted.slice(0, 3).map(([motif, count]) => ({ motif, count }));

    const summary = topMotifs.length
      ? `Convergence ${Math.round(convergence * 100)}% — motifs: ${topMotifs.map((m) => `${m.motif}×${m.count}`).join(", ")}`
      : `No motif convergence across ${observations.length} levels.`;

    return {
      t: frame.t,
      windowMs: this.#cfg.reportEveryMs,
      observations,
      summary,
      metrics: { convergence, stability: 0, fractalDim, energyMean, jaccardPrev: 0 },
      topMotifs,
    };
  }
}

// ----------------------------- Sparkline (SVG, dependency-free) -----------------------------
function Sparkline({ values, max = 1, height = 32 }: { values: number[]; max?: number; height?: number }) {
  const w = 160; const n = Math.max(1, values.length);
  const pts = values.map((v, i) => {
    const x = (i / (n - 1 || 1)) * (w - 2) + 1;
    const y = height - 2 - (Math.max(0, Math.min(max, v)) / max) * (height - 4);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={height} className="block">
      <rect x={0} y={0} width={w} height={height} rx={6} className="fill-transparent stroke-[1]" style={{ stroke: "#2a2a3a" }} />
      <polyline points={pts} fill="none" strokeWidth={2} style={{ stroke: "#8ab4ff" }} />
    </svg>
  );
}

// ----------------------------- Download helper -----------------------------
function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ----------------------------- Main Component -----------------------------
export default function TemporalGlyphOperatorGUI() {
  // Canvas + rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const bus = useMemo(() => new FrameBus(), []);

  // Controls
  const [levels, setLevels] = useState(4);
  const [cadence, setCadence] = useState(280); // ms
  const [addrDepth, setAddrDepth] = useState(8);
  const [paused, setPaused] = useState(false);

  // TGO + reports
  const [reports, setReports] = useState<Report[]>([]);
  const [stabilityHistory, setStabilityHistory] = useState<number[]>([]);
  const prevMotifSet = useRef<Set<string> | null>(null);

  // FPS tracking
  const [fps, setFps] = useState(0);

  // Mouse lens
  const [mouseInfo, setMouseInfo] = useState<{ addr: string; x: number; y: number } | null>(null);

  // Web Worker for offloading heavy computations
  const workerRef = useRef<Worker | null>(null);
  const [useWorker, setUseWorker] = useState(false);
  
  // Adaptive cadence
  const [adaptiveCadence, setAdaptiveCadence] = useState(false);
  const [currentCadence, setCurrentCadence] = useState(cadence);
  const [cadenceReason, setCadenceReason] = useState<"energy_high" | "energy_low" | "manual">("manual");
  
  // Session recording
  const recorder = useMemo(() => {
    // Simple session recorder implementation
    const events: Array<{ type: 'frame' | 'report'; data: any }> = [];
    return {
      push: (event: { type: 'frame' | 'report'; data: any }) => events.push(event),
      exportLDJSON: () => events.map(ev => JSON.stringify(ev)).join('\n'),
      clear: () => events.length = 0
    };
  }, []);
  
  // Ensemble mode
  const [ensembleMode, setEnsembleMode] = useState(false);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && useWorker) {
      const worker = new Worker(new URL('../workers/tgo.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      
      worker.onmessage = (ev: MessageEvent<any>) => {
        const payload = ev.data;
        if (payload.type === 'report') {
          // Merge with existing UI metrics/stability
          setReports((r) => [{
            t: payload.t,
            windowMs: cadence,
            observations: [],
            summary: payload.summary,
            metrics: {
              convergence: payload.metrics.convergence,
              fractalDim: payload.metrics.fractalDim,
              energyMean: payload.metrics.energyMean,
              stability: 0,
              jaccardPrev: 0
            },
            topMotifs: payload.topMotifs
          }, ...r].slice(0, 120));
        }
      };

      // Send config to worker
      worker.postMessage({ type: 'config', levels });

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    }
  }, [useWorker, levels, cadence]);

  // Start operator
  useEffect(() => {
    if (useWorker) return; // Skip if using worker

    const op = new TemporalGlyphOperator(bus, { 
      reportEveryMs: cadence, 
      levels, 
      ringSize: 12,
      adaptiveCadence: {
        enabled: adaptiveCadence,
        fastMs: 120,
        slowMs: 500,
        hiEnergy: 48,
        loEnergy: 18
      }
    });
    const off = op.on((e) => {
      if (e.type === "report") {
        // compute Jaccard similarity with previous motif set
        const current = new Set(e.report.observations.map((o) => o.motif));
        let jaccard = 0;
        if (prevMotifSet.current) {
          const inter = new Set([...current].filter((x) => prevMotifSet.current!.has(x)));
          const union = new Set([...current, ...prevMotifSet.current]);
          jaccard = union.size ? inter.size / union.size : 0;
        }
        prevMotifSet.current = current;

        // stability S: rolling average of convergence > 0.6
        const conv = e.report.metrics.convergence;
        setStabilityHistory((h) => {
          const next = [...h, conv > 0.6 ? 1 : 0].slice(-60);
          return next;
        });
        const S = stabilityHistory.length ? stabilityHistory.reduce((a, b) => a + b, 0) / stabilityHistory.length : 0;

        // Feed stability to operator
        op.setStabilityS(S);

        const enriched: Report = {
          ...e.report,
          metrics: {
            ...e.report.metrics,
            stability: S,
            jaccardPrev: jaccard,
          },
        };
        
        // Record session event
        recorder.push({ type: 'report', data: enriched });
        
        setReports((r) => [enriched, ...r].slice(0, 120));
      } else if (e.type === "cadence") {
        setCurrentCadence(e.ms);
        setCadenceReason(e.reason);
      }
    });
    op.start();
    return () => { off(); op.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus, cadence, levels, useWorker, adaptiveCadence]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const overlay = overlayRef.current!;
    const octx = overlay.getContext("2d")!;

    let raf = 0;
    let last = performance.now();
    let frames = 0;

    function draw(now: number) {
      if (!paused) {
        const dt = now - last; frames++;
        if (dt >= 1000) { setFps(frames); frames = 0; last = now; }

        const w = canvas.width;
        const h = canvas.height;
        overlay.width = w; overlay.height = h;
        // Background
        ctx.fillStyle = "#0b0b11"; ctx.fillRect(0, 0, w, h);

        // Animated chaos game points
        const ax = w * 0.12, ay = h * 0.88, bx = w * 0.88, by = h * 0.88, cx = w * 0.5, cy = h * 0.12;
        let x = (Math.sin(now * 0.0012) * 0.5 + 0.5) * w;
        let y = (Math.cos(now * 0.0011) * 0.5 + 0.5) * h;
        ctx.fillStyle = "#ff77aa"; // plasma pink
        for (let i = 0; i < 22000; i++) {
          const r = (i + Math.floor(now * 0.03)) % 3;
          if (r === 0) { x = (x + ax) / 2; y = (y + ay) / 2; }
          if (r === 1) { x = (x + bx) / 2; y = (y + by) / 2; }
          if (r === 2) { x = (x + cx) / 2; y = (y + cy) / 2; }
          if (i > 80) ctx.fillRect(x, y, 1, 1);
        }

        // Emit frame
        const img = ctx.getImageData(0, 0, w, h);
        const frame = { t: now, layer: 0, width: w, height: h, pixels: img.data };
        bus.emit(frame);
        
        // Record frame event
        recorder.push({ type: 'frame', data: frame });

        // Send to worker if enabled
        if (useWorker && workerRef.current) {
          createImageBitmap(img).then(bitmap => {
            workerRef.current?.postMessage({ type: 'frame', t: now, layer: 0, bitmap }, [bitmap]);
          });
        }
      }

      // Overlay (address lens crosshair & label)
      octx.clearRect(0, 0, overlay.width, overlay.height);
      if (mouseInfo) {
        const { x, y, addr } = mouseInfo;
        octx.strokeStyle = "#7dd3fc"; // cyan-ish
        octx.lineWidth = 1;
        octx.beginPath();
        octx.moveTo(x, 0); octx.lineTo(x, overlay.height);
        octx.moveTo(0, y); octx.lineTo(overlay.width, y);
        octx.stroke();
        const pad = 6;
        const text = `addr(depth ${addrDepth}): ${addr}`;
        const tw = octx.measureText(text).width;
        octx.fillStyle = "rgba(16,16,24,0.85)";
        octx.fillRect(Math.min(x + 10, overlay.width - tw - pad * 2), Math.max(8, y - 24), tw + pad * 2, 20);
        octx.fillStyle = "#e5e7eb"; octx.font = "12px ui-monospace";
        octx.fillText(text, Math.min(x + 10 + pad, overlay.width - tw - pad), Math.max(8, y - 10));
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bus, paused, mouseInfo, addrDepth]);

  // Mouse address lens binding
  useEffect(() => {
    const canvas = canvasRef.current!;
    const onMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const nx = x / rect.width;
      const ny = y / rect.height;
      // map to unit triangle coordinates; our drawing uses triangle corners at approx positions used above
      // Normalize to the unit triangle bounding box: we only approximate here for the lens experience.
      const addr = triIndexAt(nx, ny, addrDepth);
      setMouseInfo({ addr, x, y });
    };
    const onLeave = () => setMouseInfo(null);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    return () => { canvas.removeEventListener("mousemove", onMove); canvas.removeEventListener("mouseleave", onLeave); };
  }, [addrDepth]);

  // Derived displays
  const last = reports[0];
  const stability = stabilityHistory.length ? stabilityHistory.reduce((a, b) => a + b, 0) / stabilityHistory.length : 0;

  const exportLDJSON = () => {
    const text = reports.slice().reverse().map((r) => JSON.stringify(r)).join("\n");
    downloadText(`tgo-reports-${Date.now()}.ldjson`, text);
  };

  const exportCSV = () => {
    const header = 't,convergence,stability,fractalDim,energyMean,jaccardPrev\n';
    const rows = reports.slice().reverse().map(r => [
      Math.round(r.t),
      r.metrics.convergence.toFixed(4),
      r.metrics.stability.toFixed(4),
      r.metrics.fractalDim.toFixed(4),
      r.metrics.energyMean.toFixed(2),
      r.metrics.jaccardPrev.toFixed(4)
    ].join(','));
    const csv = header + rows.join('\n');
    downloadCSV(`tgo-reports-${Date.now()}.csv`, csv);
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-[#e9e9f0]">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-[#0a0a12cc] border-b border-[#1e1e2a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/tgo-logo.png" alt="TGO" className="w-2 h-2 rounded-xl shadow" />
            <div>
              <h1 className="text-xl font-semibold">Temporal Glyph Operator</h1>
              <p className="text-xs opacity-70">Multi-viewport observer of fractal computation — convergence, stability, and structure at a glance.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/tgo" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 border border-transparent hover:from-purple-700 hover:to-pink-700 text-sm font-medium">
              TGO Computer
            </a>
            <a href="/compare" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-pink-600 border border-transparent hover:from-blue-700 hover:to-pink-700 text-sm font-medium">
              Strategy Compare
            </a>
            <a href="/replay" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-cyan-600 border border-transparent hover:from-green-700 hover:to-cyan-700 text-sm font-medium">
              Session Replay
            </a>
            <button onClick={exportLDJSON} className="px-3 py-1.5 rounded-lg text-black border border-gray-300 hover:bg-gray-200 text-sm" style={{backgroundColor: '#f0f0f0'}}>Export LDJSON</button>
            <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg text-black border border-gray-300 hover:bg-gray-200 text-sm" style={{backgroundColor: '#f0f0f0'}}>Export CSV</button>
            <button onClick={() => {
              const text = recorder.exportLDJSON();
              const blob = new Blob([text], { type: 'application/x-ldjson' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `tgo-session-${Date.now()}.ldjson`;
              a.click();
              URL.revokeObjectURL(url);
            }} className="px-3 py-1.5 rounded-lg text-black border border-gray-300 hover:bg-gray-200 text-sm" style={{backgroundColor: '#f0f0f0'}}>Export Session</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAdaptiveCadence(!adaptiveCadence)} className={`px-3 py-1.5 rounded-lg border text-sm ${adaptiveCadence ? "bg-purple-100 text-purple-800 border-purple-300" : "text-black border-gray-300 hover:bg-gray-200"}`} style={{backgroundColor: adaptiveCadence ? undefined : '#f0f0f0'}}>
              Adaptive: {currentCadence}ms
            </button>
            <button onClick={() => setEnsembleMode(!ensembleMode)} className={`px-3 py-1.5 rounded-lg border text-sm ${ensembleMode ? "bg-orange-100 text-orange-800 border-orange-300" : "text-black border-gray-300 hover:bg-gray-200"}`} style={{backgroundColor: ensembleMode ? undefined : '#f0f0f0'}}>
              {ensembleMode ? "Ensemble: ON" : "Ensemble: OFF"}
            </button>
            <button onClick={() => setUseWorker(!useWorker)} className={`px-3 py-1.5 rounded-lg border text-sm ${useWorker ? "bg-green-100 text-green-800 border-green-300" : "text-black border-gray-300 hover:bg-gray-200"}`} style={{backgroundColor: useWorker ? undefined : '#f0f0f0'}}>
              {useWorker ? "Worker ON" : "Worker OFF"}
            </button>
            <button onClick={() => setPaused((p) => !p)} className={`px-3 py-1.5 rounded-lg border text-sm ${paused ? "bg-amber-100 text-amber-800 border-amber-300" : "text-black border-gray-300 hover:bg-gray-200"}`} style={{backgroundColor: paused ? undefined : '#f0f0f0'}}>{paused ? "Resume" : "Pause"}</button>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Canvas + overlay */}
        <section className="relative rounded-2xl border border-[#1e1e2a] shadow-lg overflow-hidden">
          <canvas ref={canvasRef} width={512} height={512} className="block w-full h-auto" />
          <canvas ref={overlayRef} width={512} height={512} className="absolute inset-0 pointer-events-none" />
          {/* Footer bar over canvas */}
          <div className="absolute left-0 right-0 bottom-0 p-3 bg-gradient-to-t from-[#0a0a12] to-transparent flex items-center justify-between text-xs">
            <span className="opacity-80">FPS: {fps} • Reports: {reports.length}</span>
            {last && (
              <span className="opacity-80">{last.summary}</span>
            )}
          </div>
        </section>

        {/* Right: Controls & Metrics */}
        <aside className="grid gap-4">
          {/* Controls */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
            <h2 className="text-sm font-semibold mb-3">Controls</h2>
            <div className="space-y-3">
              <label className="block text-xs opacity-80">Levels: {levels}
                <input type="range" min={2} max={7} value={levels} onChange={(e) => setLevels(parseInt(e.target.value))} className="w-full" />
              </label>
              <label className="block text-xs opacity-80">Report cadence: {cadence} ms
                <input type="range" min={80} max={800} step={20} value={cadence} onChange={(e) => setCadence(parseInt(e.target.value))} className="w-full" />
              </label>
              <label className="block text-xs opacity-80">Address lens depth: {addrDepth}
                <input type="range" min={3} max={14} value={addrDepth} onChange={(e) => setAddrDepth(parseInt(e.target.value))} className="w-full" />
              </label>
            </div>
          </div>

          {/* Live Metrics */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
            <h2 className="text-sm font-semibold mb-3">Live Metrics</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Metric label="Convergence" value={last ? (last.metrics.convergence * 100).toFixed(0) + "%" : "—"} />
              <Metric label="Stability S" value={((stability) * 100).toFixed(0) + "%"} />
              <Metric label="Fractal Dim" value={last ? last.metrics.fractalDim.toFixed(3) : "—"} />
              <Metric label="Energy μ" value={last ? last.metrics.energyMean.toFixed(1) : "—"} />
              <Metric label="Jaccard Δ" value={last ? (last.metrics.jaccardPrev * 100).toFixed(0) + "%" : "—"} />
              <Metric label="Levels" value={String(levels)} />
            </div>
            <div className="mt-3">
              <p className="text-xs opacity-75 mb-1">Stability (last 60 windows)</p>
              <Sparkline values={stabilityHistory} max={1} />
            </div>
          </div>

          {/* Top motifs */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
            <h2 className="text-sm font-semibold mb-3">Motifs</h2>
            <ul className="space-y-2 text-xs font-mono">
              {last?.topMotifs.map((m, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="opacity-80">{m.motif}</span>
                  <span className="px-2 py-0.5 rounded bg-[#16162a] border border-[#2a2a3a]">×{m.count}</span>
                </li>
              )) || <li className="opacity-60">—</li>}
            </ul>
          </div>

          {/* Evidence Bullets */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
            <h2 className="text-sm font-semibold mb-3">Evidence</h2>
            <div className="space-y-2 text-xs">
              {last?.evidence && last.evidence.length > 0 ? (
                last.evidence.slice(0, 3).map((e, i) => (
                  <div key={i} className="p-2 rounded border border-[#1f1f2c] bg-[#11111a]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono">{e.motif}</span>
                      <span className="text-[11px] opacity-60">×{e.count}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={e.persisted >= 2 ? "text-green-400" : "text-yellow-400"}>
                        {e.persisted >= 2 ? "persistent" : "new"} {e.persisted}w
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-green-500" 
                            style={{ width: `${e.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] opacity-60">{Math.round(e.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="opacity-60 text-center py-4">No evidence yet</div>
              )}
            </div>
          </div>

          {/* Recent Reports (compact) */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
            <h2 className="text-sm font-semibold mb-3">Recent Reports</h2>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {reports.slice(0, 12).map((r, idx) => (
                <div key={idx} className="p-2 rounded border border-[#1f1f2c] bg-[#11111a]">
                  <div className="text-[11px] opacity-70">t+{Math.round(r.t % 100000)}ms • {r.windowMs}ms</div>
                  <div className="text-xs font-mono">{r.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer note */}
      <footer className="max-w-7xl mx-auto px-4 pb-8 text-[11px] opacity-60">
        <p>
          This GUI demonstrates a <span className="opacity-80">Temporal Glyph Operator</span>: multi-resolution sampling of a live fractal field, hashed motifs, and
          simple convergence/stability evidence without recomputing underlying operations. Use the Address Lens to inspect the fractal address space visually.
        </p>
      </footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded border border-[#1f1f2c] bg-[#11111a]">
      <div className="text-[11px] opacity-60">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
