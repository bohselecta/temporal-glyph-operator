import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CSVButton } from "../components/CSVButton";

interface Run {
  t: number;
  strategy: string;
  value: number;
}

interface BucketedSeries {
  strategy: string;
  points: Array<{ t: number; value: number; count: number }>;
}

interface DivergencePoint {
  t: number;
  d: number;
}

// Mock data for now - will be replaced with real observer binding
const mockRuns: Run[] = [
  { t: Date.now() - 10000, strategy: "uniform", value: 3.14159 },
  { t: Date.now() - 8000, strategy: "energy", value: 3.14201 },
  { t: Date.now() - 6000, strategy: "uniform", value: 3.14158 },
  { t: Date.now() - 4000, strategy: "energy", value: 3.14203 },
  { t: Date.now() - 2000, strategy: "uniform", value: 3.14157 },
  { t: Date.now(), strategy: "energy", value: 3.14202 },
];

function bucketize(runs: Run[], bucketMs = 2000): BucketedSeries[] {
  const byStrategy = new Map<string, Run[]>();
  
  for (const run of runs) {
    const existing = byStrategy.get(run.strategy) || [];
    existing.push(run);
    byStrategy.set(run.strategy, existing);
  }
  
  const series: BucketedSeries[] = [];
  
  for (const [strategy, strategyRuns] of byStrategy) {
    strategyRuns.sort((a, b) => a.t - b.t);
    
    const buckets = new Map<number, Run[]>();
    for (const run of strategyRuns) {
      const bucket = Math.floor(run.t / bucketMs) * bucketMs;
      const existing = buckets.get(bucket) || [];
      existing.push(run);
      buckets.set(bucket, existing);
    }
    
    const points = Array.from(buckets.entries())
      .map(([t, runs]) => {
        const sum = runs.reduce((acc, r) => acc + r.value, 0);
        return { t, value: sum / runs.length, count: runs.length };
      })
      .sort((a, b) => a.t - b.t);
    
    series.push({ strategy, points });
  }
  
  return series;
}

function divergenceMSE(seriesA: BucketedSeries, seriesB: BucketedSeries): DivergencePoint[] {
  const result: DivergencePoint[] = [];
  
  const timesA = new Set(seriesA.points.map(p => p.t));
  const timesB = new Set(seriesB.points.map(p => p.t));
  const commonTimes = Array.from(timesA).filter(t => timesB.has(t)).sort((a, b) => a - b);
  
  for (const t of commonTimes) {
    const pointA = seriesA.points.find(p => p.t === t);
    const pointB = seriesB.points.find(p => p.t === t);
    
    if (pointA && pointB) {
      const d = Math.pow(pointA.value - pointB.value, 2);
      result.push({ t, d });
    }
  }
  
  return result;
}

export function StrategyLab() {
  const [runs, setRuns] = useState<Run[]>(mockRuns);
  const [baselineStrategy, setBaselineStrategy] = useState("uniform");
  const [bucketMs, setBucketMs] = useState(2000);
  const [filter, setFilter] = useState("");
  
  // Filter runs based on search
  const filteredRuns = runs.filter(run => 
    run.strategy.toLowerCase().includes(filter.toLowerCase())
  );
  
  const filteredSeries = bucketize(filteredRuns, bucketMs);
  const strategies = Array.from(new Set(runs.map(r => r.strategy)));
  
  // Calculate divergences
  const divergences: Record<string, DivergencePoint[]> = {};
  const baseline = filteredSeries.find(s => s.strategy === baselineStrategy);
  if (baseline) {
    for (const s of filteredSeries) {
      if (s.strategy !== baselineStrategy) {
        divergences[s.strategy] = divergenceMSE(s, baseline);
      }
    }
  }
  
  // Format data for charts
  const chartData = filteredSeries.flatMap(s => 
    s.points.map(p => ({
      time: new Date(p.t).toLocaleTimeString(),
      timestamp: p.t,
      [s.strategy]: p.value,
      [`${s.strategy}_count`]: p.count
    }))
  ).sort((a, b) => a.timestamp - b.timestamp);
  
  const divergenceData = Object.entries(divergences).flatMap(([strategy, points]) =>
    points.map(p => ({
      time: new Date(p.t).toLocaleTimeString(),
      timestamp: p.t,
      [strategy]: p.d
    }))
  ).sort((a, b) => a.timestamp - b.timestamp);
  
  const colors = {
    uniform: "#3b82f6",
    energy: "#ef4444",
    motif: "#10b981",
    unknown: "#6b7280"
  };
  
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Strategy Lab</h1>
        
        {/* Controls */}
        <div className="flex gap-2 items-center mb-6">
          <input 
            className="px-3 py-2 rounded bg-zinc-800 text-zinc-200" 
            placeholder="Filter by strategy/kernel" 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
          />
          <label className="text-zinc-300 text-sm">Baseline</label>
          <select 
            className="px-2 py-2 rounded bg-zinc-800 text-zinc-200" 
            value={baselineStrategy} 
            onChange={e => setBaselineStrategy(e.target.value)}
          >
            {strategies.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <CSVButton rows={chartData} filename={`means_${Date.now()}.csv`} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Strategy Means</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    formatter={(v: any, name: any) => [typeof v === 'number' ? v.toFixed(6) : v, name]}
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #374151",
                      borderRadius: "6px"
                    }} 
                  />
                  <Legend />
                  {strategies.map(strategy => (
                    <Line
                      key={strategy}
                      type="monotone"
                      dataKey={strategy}
                      stroke={colors[strategy as keyof typeof colors] || colors.unknown}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-zinc-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Divergence vs Baseline</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Baseline Strategy:</label>
              <select
                value={baselineStrategy}
                onChange={(e) => setBaselineStrategy(e.target.value)}
                className="bg-zinc-700 border border-zinc-600 rounded px-3 py-1 text-white"
              >
                {strategies.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={divergenceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    formatter={(v: any, name: any) => [typeof v === 'number' ? v.toFixed(6) : v, name]}
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #374151",
                      borderRadius: "6px"
                    }} 
                  />
                  <Legend />
                  {Object.keys(divergences).map(strategy => (
                    <Line
                      key={strategy}
                      type="monotone"
                      dataKey={strategy}
                      stroke={colors[strategy as keyof typeof colors] || colors.unknown}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2">
              <CSVButton rows={divergenceData} filename={`divergence_${Date.now()}.csv`} />
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Bucket Size (ms):</label>
              <input
                type="number"
                value={bucketMs}
                onChange={(e) => setBucketMs(Number(e.target.value))}
                className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-1 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Total Runs:</label>
              <div className="text-lg font-mono">{runs.length}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Strategies:</label>
              <div className="text-lg font-mono">{strategies.join(", ")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
