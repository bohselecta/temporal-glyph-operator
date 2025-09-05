import React, { useState } from "react";
import { evaluateExpression } from "@glyph/kernels";

// ──────────────────────────────────────────────────────────────────────────────
// Navigation Tabs Component
// ──────────────────────────────────────────────────────────────────────────────

interface NavTabsProps {
  activeTab: string;
}

function NavTabs({ activeTab }: NavTabsProps) {
  const tabs = [
    { id: 'tgo', label: 'TGO', href: '/tgo' },
    { id: 'strategy', label: 'Strategy Lab', href: '/strategy' },
    { id: 'gallery', label: 'Gallery', href: '/gallery' },
    { id: 'compare', label: 'Compare', href: '/compare' },
    { id: 'replay', label: 'Replay', href: '/replay' },
    { id: 'calc', label: 'Calculator', href: '/calc' },
  ];

  return (
    <div className="border-b border-zinc-800 mb-6">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TGO Compute Integration
// ──────────────────────────────────────────────────────────────────────────────

interface TGOGlobals {
  __TGO_PLANNER__?: {
    submit: (job: any) => Promise<string>;
  };
  __TGO_OBSERVER__?: {
    on: (event: string, callback: (data: any) => void) => void;
    off: (event: string, callback: (data: any) => void) => void;
  };
}

async function computeWithTGO(expression: string, timeoutMs = 5000): Promise<{ result: number; meta: any }> {
  const globals = window as unknown as TGOGlobals;
  
  if (!globals.__TGO_PLANNER__ || !globals.__TGO_OBSERVER__) {
    throw new Error('TGO system not initialized. Please reload the page.');
  }

  const jobId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      globals.__TGO_OBSERVER__?.off('pinned', pinnedHandler);
      reject(new Error(`TGO computation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const pinnedHandler = (data: any) => {
      if (data.jobId === jobId) {
        clearTimeout(timeout);
        globals.__TGO_OBSERVER__?.off('pinned', pinnedHandler);
        
        if (data.payload?.meta?.error) {
          reject(new Error(`TGO kernel error: ${data.payload.meta.error}`));
        } else {
          resolve({
            result: data.payload.result,
            meta: data.payload.meta
          });
        }
      }
    };

    globals.__TGO_OBSERVER__?.on('pinned', pinnedHandler);

    // Submit job to planner
    globals.__TGO_PLANNER__?.submit({
      jobId,
      kernel: 'calc',
      payload: {
        expression,
        meta: {
          kernel: 'calc',
          timestamp: Date.now()
        }
      }
    }).catch((error) => {
      clearTimeout(timeout);
      globals.__TGO_OBSERVER__?.off('pinned', pinnedHandler);
      reject(error);
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Calculator Component
// ──────────────────────────────────────────────────────────────────────────────

// Preset expressions for quick demos
const PRESETS = [
  { label: "Basic", expr: "(1+2)*3^4/5 - 6" },
  { label: "Power", expr: "2^32" },
  { label: "Trig", expr: "sin(3.14159/2)" },
  { label: "Complex", expr: "sqrt(16) + abs(-5)" },
  { label: "Scientific", expr: "1e6*(sqrt(2)^2-2)" },
  { label: "Stress", expr: "2^64" }
];

export default function CalcCompare() {
  const [expression, setExpression] = useState("(1+2)*3^4/5 - 6");
  const [cpuMs, setCpuMs] = useState<number | null>(null);
  const [cpuOut, setCpuOut] = useState("");
  const [tgoMs, setTgoMs] = useState<number | null>(null);
  const [tgoOut, setTgoOut] = useState("");
  const [computing, setComputing] = useState(false);
  const [numRuns, setNumRuns] = useState(1);
  const [timingSamples, setTimingSamples] = useState<Array<{expression: string, cpuMs: number, tgoMs: number, timestamp: number}>>([]);

  const fmt = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const trunc = (str: string, maxLen = 1000) => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '... (truncated)';
  };

  const handleCompute = async () => {
    if (!expression.trim() || computing) return;
    
    setComputing(true);
    setCpuMs(null);
    setCpuOut("");
    setTgoMs(null);
    setTgoOut("");

    const runSamples: Array<{cpuMs: number, tgoMs: number}> = [];
    let lastCpuResult: any = null;
    let lastTgoResult: any = null;
    let lastCpuError: any = null;
    let lastTgoError: any = null;

    // Run multiple iterations
    for (let run = 0; run < numRuns; run++) {
      const runSample = { cpuMs: 0, tgoMs: 0 };

      // CPU computation
      try {
        const cpuStart = performance.now();
        const cpuResult = evaluateExpression(expression);
        const cpuEnd = performance.now();
        
        runSample.cpuMs = cpuEnd - cpuStart;
        lastCpuResult = {
          result: cpuResult,
          expression,
          method: 'cpu',
          timestamp: Date.now(),
          run: run + 1,
          totalRuns: numRuns
        };
      } catch (error) {
        runSample.cpuMs = 0;
        lastCpuError = {
          error: error instanceof Error ? error.message : 'Unknown error',
          expression,
          method: 'cpu',
          timestamp: Date.now(),
          run: run + 1,
          totalRuns: numRuns
        };
      }

      // TGO computation
      try {
        const tgoStart = performance.now();
        const tgoResult = await computeWithTGO(expression);
        const tgoEnd = performance.now();
        
        runSample.tgoMs = tgoEnd - tgoStart;
        lastTgoResult = {
          result: tgoResult.result,
          expression,
          method: 'tgo',
          meta: tgoResult.meta,
          timestamp: Date.now(),
          run: run + 1,
          totalRuns: numRuns
        };
      } catch (error) {
        runSample.tgoMs = 0;
        lastTgoError = {
          error: error instanceof Error ? error.message : 'Unknown error',
          expression,
          method: 'tgo',
          timestamp: Date.now(),
          run: run + 1,
          totalRuns: numRuns
        };
      }

      runSamples.push(runSample);
    }

    // Calculate statistics
    const cpuTimes = runSamples.map(s => s.cpuMs).filter(t => t > 0);
    const tgoTimes = runSamples.map(s => s.tgoMs).filter(t => t > 0);
    
    const cpuMean = cpuTimes.length > 0 ? cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length : 0;
    const tgoMean = tgoTimes.length > 0 ? tgoTimes.reduce((a, b) => a + b, 0) / tgoTimes.length : 0;
    const cpuBest = cpuTimes.length > 0 ? Math.min(...cpuTimes) : 0;
    const tgoBest = tgoTimes.length > 0 ? Math.min(...tgoTimes) : 0;

    // Update UI with mean times
    setCpuMs(cpuMean);
    setTgoMs(tgoMean);

    // Update outputs with statistics
    const cpuStats = numRuns > 1 ? {
      mean: `${cpuMean.toFixed(2)}ms`,
      best: `${cpuBest.toFixed(2)}ms`,
      runs: cpuTimes.length,
      samples: cpuTimes.map(t => `${t.toFixed(2)}ms`)
    } : undefined;

    const tgoStats = numRuns > 1 ? {
      mean: `${tgoMean.toFixed(2)}ms`,
      best: `${tgoBest.toFixed(2)}ms`, 
      runs: tgoTimes.length,
      samples: tgoTimes.map(t => `${t.toFixed(2)}ms`)
    } : undefined;

    setCpuOut(JSON.stringify({
      ...(lastCpuResult || lastCpuError),
      ...(cpuStats && { statistics: cpuStats })
    }, null, 2));

    setTgoOut(JSON.stringify({
      ...(lastTgoResult || lastTgoError),
      ...(tgoStats && { statistics: tgoStats })
    }, null, 2));

    // Add to timing samples for CSV export
    if (cpuMean > 0 && tgoMean > 0) {
      setTimingSamples(prev => [...prev, {
        expression,
        cpuMs: cpuMean,
        tgoMs: tgoMean,
        timestamp: Date.now()
      }]);
    }

    setComputing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCompute();
    }
  };

  const handleClear = () => {
    setExpression("");
    setCpuMs(null);
    setCpuOut("");
    setTgoMs(null);
    setTgoOut("");
  };

  const exportTimingCSV = () => {
    if (timingSamples.length === 0) {
      alert("No timing data to export. Run some calculations first.");
      return;
    }

    const headers = ["Expression", "CPU (ms)", "TGO (ms)", "Speedup", "Timestamp"];
    const rows = timingSamples.map(sample => [
      `"${sample.expression.replace(/"/g, '""')}"`, // Escape quotes in CSV
      sample.cpuMs.toFixed(3),
      sample.tgoMs.toFixed(3),
      (sample.cpuMs / sample.tgoMs).toFixed(2),
      new Date(sample.timestamp).toISOString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `calculator-timings-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <NavTabs activeTab="calc" />
        
        <h1 className="text-3xl font-bold mb-8">Calculator Compare</h1>
        
        {/* Input Section */}
        <div className="mb-8">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter mathematical expression (e.g., (1+2)*3^4/5 - 6)"
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-500"
              disabled={computing}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-400">Runs:</label>
              <select
                value={numRuns}
                onChange={(e) => setNumRuns(Number(e.target.value))}
                className="px-3 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-cyan-500"
                disabled={computing}
                title="Number of runs for statistical analysis"
              >
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
            <button
              onClick={handleCompute}
              disabled={computing || !expression.trim()}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {computing ? "Computing..." : "Compute"}
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 font-semibold transition-colors"
            >
              Clear
            </button>
            <button
              onClick={exportTimingCSV}
              disabled={timingSamples.length === 0}
              className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed font-semibold transition-colors"
              title={`Export ${timingSamples.length} timing samples to CSV`}
            >
              CSV ({timingSamples.length})
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="mb-4">
            <div className="text-sm text-zinc-400 mb-2">Quick presets:</div>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setExpression(preset.expr)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm transition-colors"
                  disabled={computing}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-sm text-zinc-400">
            Supported: +, -, *, /, ^ (power), sin, cos, tan, log, sqrt, abs, parentheses
            {numRuns > 1 && <span className="ml-4">• Running {numRuns} iterations for statistical analysis</span>}
          </div>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-lg font-semibold mb-1">CPU (baseline)</div>
            <div className="text-sm text-zinc-400 mb-3">Regular single‑threaded evaluation on your machine.</div>
            <div className="text-sm mb-2">
              {cpuMs == null ? "—" : (
                numRuns > 1 ? `Mean: ${fmt(cpuMs)}` : fmt(cpuMs)
              )}
            </div>
            <textarea
              readOnly
              value={trunc(cpuOut)}
              className="w-full h-28 px-3 py-2 rounded-xl bg-black/40 border border-zinc-800 text-zinc-100 font-mono text-sm"
              placeholder="Results will appear here..."
            />
          </div>

          {/* TGO Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-lg font-semibold mb-1">TGO (temporal)</div>
            <div className="text-sm text-zinc-400 mb-3">Planner→kernel pipeline with real TGO calc kernel.</div>
            <div className="text-sm mb-2">
              {tgoMs == null ? "—" : (
                numRuns > 1 ? `Mean: ${fmt(tgoMs)}` : fmt(tgoMs)
              )}
            </div>
            <textarea
              readOnly
              value={trunc(tgoOut)}
              className="w-full h-28 px-3 py-2 rounded-xl bg-black/40 border border-zinc-800 text-zinc-100 font-mono text-sm"
              placeholder="Results will appear here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
