"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { computeDivergence, findPeaks, exportPeakCSV, type Peak, type PeakParams } from "@glyph/report-engine";

/**
 * Temporal Glyph Operator — Side-by-Side Strategy Comparison
 * ---------------------------------------------------------
 * - Dual-panel layout showing same fractal stream
 * - Left panel: Uniform sampling strategy
 * - Right panel: Energy-biased sampling strategy
 * - A/B sparkline visualization showing strategy divergence
 * - Real-time metric comparison panels
 * - Strategy selection controls
 */

// Import types and utilities from the main page
type Vec = { x: number; y: number };
type Frame = {
  t: number;
  layer: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  meta?: Record<string, unknown>;
};
type ViewSample = {
  layer: number;
  level: number;
  hash: bigint;
  energy: number;
  grad: number;
};
type Observation = {
  t: number;
  layer: number;
  level: number;
  motif: string;
  signal: number;
  grad: number;
};
type Report = {
  t: number;
  windowMs: number;
  observations: Observation[];
  summary: string;
  metrics: {
    convergence: number;
    stability: number;
    fractalDim: number;
    energyMean: number;
    jaccardPrev: number;
  };
  topMotifs: { motif: string; count: number }[];
};

// Strategy types
type Strategy = 'uniform' | 'energyBiased' | 'addressAware';

// Frame Bus
class FrameBus {
  private listeners = new Set<(f: Frame) => void>();
  emit(frame: Frame) { this.listeners.forEach((h) => h(frame)); }
  subscribe(h: (f: Frame) => void) {
    this.listeners.add(h);
    return () => this.listeners.delete(h);
  }
}

// Strategy comparison component
function StrategyComparison() {
  // Canvas refs for both panels
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const rightOverlayRef = useRef<HTMLCanvasElement | null>(null);
  
  // Frame bus for synchronized frame distribution
  const bus = useMemo(() => new FrameBus(), []);
  
  // Strategy states
  const [leftStrategy, setLeftStrategy] = useState<Strategy>('uniform');
  const [rightStrategy, setRightStrategy] = useState<Strategy>('energyBiased');
  
  // Reports for both strategies
  const [leftReports, setLeftReports] = useState<Report[]>([]);
  const [rightReports, setRightReports] = useState<Report[]>([]);
  
  // Stability histories for A/B sparklines
  const [leftStabilityHistory, setLeftStabilityHistory] = useState<number[]>([]);
  const [rightStabilityHistory, setRightStabilityHistory] = useState<number[]>([]);
  
  // Controls
  const [levels, setLevels] = useState(4);
  const [cadence, setCadence] = useState(280);
  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(0);
  
  // Peak detection state
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<number | null>(null);
  const [peakParams, setPeakParams] = useState<PeakParams>({
    window: 15,
    prominenceMin: 0.08,
    distanceMin: 10,
    alpha: 0.6,
    beta: 0.2,
    gamma: 0.2
  });
  const [showPeakDetection, setShowPeakDetection] = useState(false);

  // A/B Sparkline component
  function ABSparkline({ 
    leftValues, 
    rightValues, 
    max = 1, 
    height = 40 
  }: { 
    leftValues: number[]; 
    rightValues: number[]; 
    max?: number; 
    height?: number; 
  }) {
    const w = 200;
    const n = Math.max(1, Math.max(leftValues.length, rightValues.length));
    
    const leftPts = leftValues.map((v, i) => {
      const x = (i / (n - 1 || 1)) * (w - 2) + 1;
      const y = height - 2 - (Math.max(0, Math.min(max, v)) / max) * (height - 4);
      return `${x},${y}`;
    }).join(" ");
    
    const rightPts = rightValues.map((v, i) => {
      const x = (i / (n - 1 || 1)) * (w - 2) + 1;
      const y = height - 2 - (Math.max(0, Math.min(max, v)) / max) * (height - 4);
      return `${x},${y}`;
    }).join(" ");

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Uniform</span>
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span>Energy-Biased</span>
        </div>
        <svg width={w} height={height} className="block">
          <rect x={0} y={0} width={w} height={height} rx={6} className="fill-transparent stroke-[1]" style={{ stroke: "#2a2a3a" }} />
          <polyline points={leftPts} fill="none" strokeWidth={2} style={{ stroke: "#3b82f6" }} />
          <polyline points={rightPts} fill="none" strokeWidth={2} style={{ stroke: "#ec4899" }} />
        </svg>
      </div>
    );
  }

  // Metric comparison component
  function MetricComparison({ 
    leftReport, 
    rightReport, 
    leftStability, 
    rightStability 
  }: { 
    leftReport: Report | undefined; 
    rightReport: Report | undefined; 
    leftStability: number; 
    rightStability: number; 
  }) {
    const metrics = [
      { label: 'Convergence', left: leftReport?.metrics.convergence ?? 0, right: rightReport?.metrics.convergence ?? 0 },
      { label: 'Stability S', left: leftStability, right: rightStability },
      { label: 'Fractal Dim', left: leftReport?.metrics.fractalDim ?? 0, right: rightReport?.metrics.fractalDim ?? 0 },
      { label: 'Energy μ', left: leftReport?.metrics.energyMean ?? 0, right: rightReport?.metrics.energyMean ?? 0 },
    ];

    return (
      <div className="grid grid-cols-2 gap-3 text-xs">
        {metrics.map(({ label, left, right }) => (
          <div key={label} className="space-y-1">
            <div className="text-[11px] opacity-60">{label}</div>
            <div className="flex items-center justify-between">
              <span className="text-blue-400 font-mono">{left.toFixed(3)}</span>
              <span className="text-pink-400 font-mono">{right.toFixed(3)}</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-blue-500" 
                  style={{ width: `${Math.min(100, (left / Math.max(left, right, 0.001)) * 100)}%` }}
                />
                <div 
                  className="bg-pink-500" 
                  style={{ width: `${Math.min(100, (right / Math.max(left, right, 0.001)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Peak detection functions
  const findPeaksInData = () => {
    if (leftStabilityHistory.length === 0 || rightStabilityHistory.length === 0) return;
    
    const minLength = Math.min(leftStabilityHistory.length, rightStabilityHistory.length);
    const series = [
      leftStabilityHistory.slice(0, minLength),
      rightStabilityHistory.slice(0, minLength)
    ];
    
    const divergencePoints = computeDivergence(series);
    const detectedPeaks = findPeaks(divergencePoints, peakParams);
    setPeaks(detectedPeaks);
  };

  const jumpToPeak = (peakIndex: number) => {
    setSelectedPeak(peakIndex);
    // This would ideally scrub the timeline to the peak index
    // For now, we'll just highlight it
  };

  const exportPeaks = () => {
    if (peaks.length === 0) return;
    
    const csv = exportPeakCSV(peaks);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tgo-peaks-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render loop for both canvases
  useEffect(() => {
    const leftCanvas = leftCanvasRef.current!;
    const rightCanvas = rightCanvasRef.current!;
    const leftCtx = leftCanvas.getContext("2d", { willReadFrequently: true })!;
    const rightCtx = rightCanvas.getContext("2d", { willReadFrequently: true })!;
    const leftOverlay = leftOverlayRef.current!;
    const rightOverlay = rightOverlayRef.current!;
    const leftOctx = leftOverlay.getContext("2d")!;
    const rightOctx = rightOverlay.getContext("2d")!;

    let raf = 0;
    let last = performance.now();
    let frames = 0;

    function draw(now: number) {
      if (!paused) {
        const dt = now - last; frames++;
        if (dt >= 1000) { setFps(frames); frames = 0; last = now; }

        const w = (leftCanvas.width = rightCanvas.width = 320);
        const h = (leftCanvas.height = rightCanvas.height = 270);
        leftOverlay.width = rightOverlay.width = w;
        leftOverlay.height = rightOverlay.height = h;

        // Draw identical fractal on both canvases
        [leftCtx, rightCtx].forEach(ctx => {
          ctx.fillStyle = "#0b0b11"; 
          ctx.fillRect(0, 0, w, h);

          // Animated chaos game points
          const ax = w * 0.12, ay = h * 0.88, bx = w * 0.88, by = h * 0.88, cx = w * 0.5, cy = h * 0.12;
          let x = (Math.sin(now * 0.0012) * 0.5 + 0.5) * w;
          let y = (Math.cos(now * 0.0011) * 0.5 + 0.5) * h;
          ctx.fillStyle = "#ff77aa";
          for (let i = 0; i < 15000; i++) {
            const r = (i + Math.floor(now * 0.03)) % 3;
            if (r === 0) { x = (x + ax) / 2; y = (y + ay) / 2; }
            if (r === 1) { x = (x + bx) / 2; y = (y + by) / 2; }
            if (r === 2) { x = (x + cx) / 2; y = (y + cy) / 2; }
            if (i > 80) ctx.fillRect(x, y, 1, 1);
          }
        });

        // Emit frame to both strategies
        const img = leftCtx.getImageData(0, 0, w, h);
        bus.emit({ t: now, layer: 0, width: w, height: h, pixels: img.data });
      }

      // Clear overlays
      leftOctx.clearRect(0, 0, leftOverlay.width, leftOverlay.height);
      rightOctx.clearRect(0, 0, rightOverlay.width, rightOverlay.height);

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [bus, paused]);

  // Mock strategy analysis (simplified for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused) {
        const now = performance.now();
        
        // Simulate different convergence rates for different strategies
        const leftConvergence = leftStrategy === 'uniform' ? 0.3 + Math.random() * 0.4 : 0.5 + Math.random() * 0.3;
        const rightConvergence = rightStrategy === 'energyBiased' ? 0.6 + Math.random() * 0.3 : 0.4 + Math.random() * 0.4;
        
        const leftReport: Report = {
          t: now,
          windowMs: cadence,
          observations: [],
          summary: `${leftStrategy}: ${Math.round(leftConvergence * 100)}% convergence`,
          metrics: {
            convergence: leftConvergence,
            stability: 0,
            fractalDim: 1.6 + Math.random() * 0.3,
            energyMean: 50 + Math.random() * 30,
            jaccardPrev: 0
          },
          topMotifs: []
        };
        
        const rightReport: Report = {
          t: now,
          windowMs: cadence,
          observations: [],
          summary: `${rightStrategy}: ${Math.round(rightConvergence * 100)}% convergence`,
          metrics: {
            convergence: rightConvergence,
            stability: 0,
            fractalDim: 1.6 + Math.random() * 0.3,
            energyMean: 50 + Math.random() * 30,
            jaccardPrev: 0
          },
          topMotifs: []
        };

        setLeftReports(r => [leftReport, ...r].slice(0, 60));
        setRightReports(r => [rightReport, ...r].slice(0, 60));
        
        setLeftStabilityHistory(h => [...h, leftConvergence > 0.6 ? 1 : 0].slice(-30));
        setRightStabilityHistory(h => [...h, rightConvergence > 0.6 ? 1 : 0].slice(-30));
      }
    }, cadence);

    return () => clearInterval(interval);
  }, [paused, cadence, leftStrategy, rightStrategy]);

  const leftStability = leftStabilityHistory.length ? leftStabilityHistory.reduce((a, b) => a + b, 0) / leftStabilityHistory.length : 0;
  const rightStability = rightStabilityHistory.length ? rightStabilityHistory.reduce((a, b) => a + b, 0) / rightStabilityHistory.length : 0;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-[#e9e9f0]">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-[#0a0a12cc] border-b border-[#1e1e2a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/tgo-logo.png" alt="TGO" className="w-3 h-3 rounded-xl shadow" />
            <div>
              <h1 className="text-xl font-semibold">Strategy Comparison Lab</h1>
              <p className="text-xs opacity-70">Side-by-side analysis of sampling strategies — see convergence patterns diverge in real-time.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="px-3 py-1.5 rounded-lg bg-[#16162a] border border-[#2a2a3a] hover:bg-[#1a1a30] text-sm">
              ← Back to TGO
            </a>
            <a href="/calc" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 border border-transparent hover:from-orange-700 hover:to-red-700 text-sm font-medium">
              Calculator
            </a>
            <a href="/gallery" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 border border-transparent hover:from-teal-700 hover:to-cyan-700 text-sm font-medium">
              Gallery
            </a>
            <a href="/strategy" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent hover:from-indigo-700 hover:to-purple-700 text-sm font-medium">
              Strategy Lab
            </a>
            <button onClick={() => setPaused((p) => !p)} className={`px-3 py-1.5 rounded-lg border text-sm ${paused ? "bg-amber-800/30 border-amber-700" : "bg-[#16162a] border-[#2a2a3a] hover:bg-[#1a1a30]"}`}>
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>
      </header>

      {/* Main comparison layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Dual canvas panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Uniform Strategy */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <h2 className="text-lg font-semibold">Uniform Sampling</h2>
              <select 
                value={leftStrategy} 
                onChange={(e) => setLeftStrategy(e.target.value as Strategy)}
                className="px-2 py-1 rounded bg-[#16162a] border border-[#2a2a3a] text-sm"
              >
                <option value="uniform">Uniform</option>
                <option value="energyBiased">Energy-Biased</option>
                <option value="addressAware">Address-Aware</option>
              </select>
            </div>
            <div className="relative rounded-2xl border border-[#1e1e2a] shadow-lg overflow-hidden">
              <canvas ref={leftCanvasRef} className="block w-full h-auto" />
              <canvas ref={leftOverlayRef} className="absolute inset-0 pointer-events-none" />
            </div>
          </div>

          {/* Right Panel - Energy-Biased Strategy */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-pink-500"></div>
              <h2 className="text-lg font-semibold">Energy-Biased Sampling</h2>
              <select 
                value={rightStrategy} 
                onChange={(e) => setRightStrategy(e.target.value as Strategy)}
                className="px-2 py-1 rounded bg-[#16162a] border border-[#2a2a3a] text-sm"
              >
                <option value="uniform">Uniform</option>
                <option value="energyBiased">Energy-Biased</option>
                <option value="addressAware">Address-Aware</option>
              </select>
            </div>
            <div className="relative rounded-2xl border border-[#1e1e2a] shadow-lg overflow-hidden">
              <canvas ref={rightCanvasRef} className="block w-full h-auto" />
              <canvas ref={rightOverlayRef} className="absolute inset-0 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* A/B Analysis Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* A/B Sparkline */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
            <h3 className="text-sm font-semibold mb-3">Stability Comparison</h3>
            <ABSparkline 
              leftValues={leftStabilityHistory} 
              rightValues={rightStabilityHistory} 
              max={1} 
            />
            <div className="mt-3 text-xs opacity-75">
              <div>Left: {leftStability.toFixed(3)} | Right: {rightStability.toFixed(3)}</div>
              <div>Divergence: {Math.abs(leftStability - rightStability).toFixed(3)}</div>
            </div>
          </div>

          {/* Metric Comparison */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
            <h3 className="text-sm font-semibold mb-3">Live Metrics</h3>
            <MetricComparison 
              leftReport={leftReports[0]} 
              rightReport={rightReports[0]}
              leftStability={leftStability}
              rightStability={rightStability}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
          <h3 className="text-sm font-semibold mb-3">Controls</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-xs opacity-80">
              Levels: {levels}
              <input 
                type="range" 
                min={2} 
                max={7} 
                value={levels} 
                onChange={(e) => setLevels(parseInt(e.target.value))} 
                className="w-full" 
              />
            </label>
            <label className="block text-xs opacity-80">
              Report cadence: {cadence} ms
              <input 
                type="range" 
                min={80} 
                max={800} 
                step={20} 
                value={cadence} 
                onChange={(e) => setCadence(parseInt(e.target.value))} 
                className="w-full" 
              />
            </label>
          </div>
          <div className="mt-3 text-xs opacity-60">
            FPS: {fps} • Reports: L:{leftReports.length} R:{rightReports.length}
          </div>
        </div>

        {/* Peak Detection Controls */}
        <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Peak Detection</h3>
            <button 
              onClick={() => setShowPeakDetection(!showPeakDetection)}
              className={`px-3 py-1 rounded text-xs ${showPeakDetection ? 'bg-orange-800/30 border-orange-700' : 'bg-[#16162a] border-[#2a2a3a]'} border`}
            >
              {showPeakDetection ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showPeakDetection && (
            <div className="space-y-4">
              {/* Peak Detection Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-xs opacity-80">
                  Window: {peakParams.window}
                  <input 
                    type="range" 
                    min={5} 
                    max={60} 
                    value={peakParams.window || 15} 
                    onChange={(e) => setPeakParams(prev => ({ ...prev, window: parseInt(e.target.value) }))} 
                    className="w-full" 
                  />
                </label>
                <label className="block text-xs opacity-80">
                  Min Prominence: {(peakParams.prominenceMin || 0.08).toFixed(3)}
                  <input 
                    type="range" 
                    min={0.02} 
                    max={0.30} 
                    step={0.01} 
                    value={peakParams.prominenceMin || 0.08} 
                    onChange={(e) => setPeakParams(prev => ({ ...prev, prominenceMin: parseFloat(e.target.value) }))} 
                    className="w-full" 
                  />
                </label>
                <label className="block text-xs opacity-80">
                  Min Distance: {peakParams.distanceMin}
                  <input 
                    type="range" 
                    min={1} 
                    max={60} 
                    value={peakParams.distanceMin || 10} 
                    onChange={(e) => setPeakParams(prev => ({ ...prev, distanceMin: parseInt(e.target.value) }))} 
                    className="w-full" 
                  />
                </label>
                <div className="flex gap-2">
                  <button 
                    onClick={findPeaksInData}
                    className="px-3 py-1 rounded text-xs bg-blue-800/30 border border-blue-700 hover:bg-blue-700/30"
                  >
                    Find Peaks
                  </button>
                  <button 
                    onClick={exportPeaks}
                    disabled={peaks.length === 0}
                    className="px-3 py-1 rounded text-xs bg-green-800/30 border border-green-700 hover:bg-green-700/30 disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Peaks List */}
              {peaks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold mb-2">Detected Peaks ({peaks.length})</h4>
                  <div className="max-h-48 overflow-auto space-y-1">
                    {peaks.slice(0, 10).map((peak, i) => (
                      <div 
                        key={i}
                        onClick={() => jumpToPeak(peak.index)}
                        className={`p-2 rounded text-xs cursor-pointer border ${
                          selectedPeak === peak.index 
                            ? 'bg-orange-800/30 border-orange-700' 
                            : 'bg-[#11111a] border-[#1f1f2c] hover:bg-[#1a1a30]'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono">#{peak.index}</span>
                          <span className="opacity-60">Δ: {peak.delta.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="opacity-60">Prominence: {peak.prominence.toFixed(4)}</span>
                          <span className="opacity-60">Conf: {(peak.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                    {peaks.length > 10 && (
                      <div className="text-center text-xs opacity-60 py-2">
                        ... and {peaks.length - 10} more peaks
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default StrategyComparison;
