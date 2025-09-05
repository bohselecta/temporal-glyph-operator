"use client";
import React, { useState } from "react";
import { replaySession, type Session, findPeaksInSession, exportPeakCSV, type Peak } from "@glyph/report-engine";

export default function ReplayPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [showPeakAnalysis, setShowPeakAnalysis] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    
    setError(null);
    f.text()
      .then(txt => {
        try {
          const s = replaySession(txt);
          setSession(s);
          setPeaks([]); // Reset peaks when loading new session
        } catch (err) {
          setError(`Failed to parse session: ${err}`);
        }
      })
      .catch(err => {
        setError(`Failed to read file: ${err}`);
      });
  }

  function analyzePeaks() {
    if (!session) return;
    
    try {
      const detectedPeaks = findPeaksInSession(session);
      setPeaks(detectedPeaks);
      setShowPeakAnalysis(true);
    } catch (err) {
      setError(`Failed to analyze peaks: ${err}`);
    }
  }

  function exportPeaks() {
    if (peaks.length === 0) return;
    
    const csv = exportPeakCSV(peaks);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tgo-peaks-${session?.started || Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/tgo-logo.png" alt="TGO" className="w-3 h-3 rounded-xl shadow" />
            <h1 className="text-2xl font-bold">Session Replay</h1>
          </div>
          <p className="text-sm opacity-70">Load and analyze exported Temporal Glyph Operator sessions</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Upload */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-6">
            <h2 className="text-lg font-semibold mb-4">Load Session</h2>
            
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm opacity-80 mb-2 block">Select .ldjson file</span>
                <input 
                  type="file" 
                  accept=".ldjson" 
                  onChange={onFile}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#16162a] file:text-white hover:file:bg-[#1a1a30]"
                />
              </label>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-700 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {session && (
                <div className="space-y-3 p-4 rounded-lg bg-[#11111a] border border-[#1f1f2c]">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="opacity-60">Started:</span>
                      <div className="font-mono">{new Date(session.started).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="opacity-60">Duration:</span>
                      <div className="font-mono">
                        {session.ended ? `${((session.ended - session.started) / 1000).toFixed(1)}s` : 'Running'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="opacity-60">Total Events:</span>
                      <div className="font-mono">{session.events.length}</div>
                    </div>
                    <div>
                      <span className="opacity-60">Reports:</span>
                      <div className="font-mono">
                        {session.events.filter(e => e.type === 'report').length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Preview */}
          <div className="rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-6">
            <h2 className="text-lg font-semibold mb-4">Session Preview</h2>
            
            {session ? (
              <div className="space-y-4">
                <div className="text-sm opacity-80">
                  Showing first 200 events from {session.events.length} total
                </div>
                
                <div className="max-h-96 overflow-auto border border-[#1f1f2c] rounded-lg p-3 bg-[#11111a]">
                  <div className="space-y-1 font-mono text-xs">
                    {session.events.slice(0, 200).map((ev, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-blue-400 opacity-60 w-8">{i}</span>
                        <span className="text-green-400">{ev.type}</span>
                        <span className="text-gray-400">
                          {ev.type === 'frame' 
                            ? `t=${ev.frame.t} ${ev.frame.width}×${ev.frame.height}`
                            : `convergence=${ev.report?.metrics?.convergence?.toFixed(3) ?? 'N/A'}`
                          }
                        </span>
                      </div>
                    ))}
                    {session.events.length > 200 && (
                      <div className="text-center text-gray-500 py-2">
                        ... and {session.events.length - 200} more events
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No session loaded
              </div>
            )}
          </div>
        </div>

        {/* Analysis Tools */}
        {session && (
          <div className="mt-8 rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-6">
            <h2 className="text-lg font-semibold mb-4">Analysis Tools</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button 
                onClick={() => {
                  const data = JSON.stringify(session, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tgo-session-${session.started}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="p-3 rounded-lg bg-[#16162a] border border-[#2a2a3a] hover:bg-[#1a1a30] text-sm"
              >
                Export Full JSON
              </button>
              
              <button 
                onClick={() => {
                  const ldjson = session.events.map(ev => JSON.stringify(ev)).join('\n');
                  const blob = new Blob([ldjson], { type: 'application/x-ldjson' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tgo-session-${session.started}.ldjson`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="p-3 rounded-lg bg-[#16162a] border border-[#2a2a3a] hover:bg-[#1a1a30] text-sm"
              >
                Export LDJSON
              </button>
              
              <button 
                onClick={() => {
                  const reports = session.events.filter(e => e.type === 'report');
                  const csv = [
                    'timestamp,convergence,stability,fractalDim,energyMean,jaccardPrev',
                    ...reports.map(r => 
                      r.type === 'report' ? 
                        `${r.report.t},${r.report.metrics?.convergence ?? 0},${r.report.metrics?.stability ?? 0},${r.report.metrics?.fractalDim ?? 0},${r.report.metrics?.energyMean ?? 0},${r.report.metrics?.jaccardPrev ?? 0}` :
                        ''
                    ).filter(Boolean)
                  ].join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `tgo-session-${session.started}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="p-3 rounded-lg bg-[#16162a] border border-[#2a2a3a] hover:bg-[#1a1a30] text-sm"
              >
                Export CSV
              </button>
              
              <button 
                onClick={analyzePeaks}
                className="p-3 rounded-lg bg-orange-800/30 border border-orange-700 hover:bg-orange-700/30 text-sm"
              >
                Analyze Divergence Peaks
              </button>
            </div>
          </div>
        )}

        {/* Peak Analysis Results */}
        {showPeakAnalysis && peaks.length > 0 && (
          <div className="mt-8 rounded-2xl border border-[#1e1e2a] bg-[#0f0f18] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Divergence Peak Analysis</h2>
              <div className="flex gap-2">
                <button 
                  onClick={exportPeaks}
                  className="px-3 py-1 rounded text-sm bg-green-800/30 border border-green-700 hover:bg-green-700/30"
                >
                  Export Peaks CSV
                </button>
                <a 
                  href="/compare"
                  className="px-3 py-1 rounded text-sm bg-blue-800/30 border border-blue-700 hover:bg-blue-700/30"
                >
                  Open in Compare Lab
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Peaks Summary */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Peak Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-60">Total Peaks:</span>
                    <span className="font-mono">{peaks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Max Divergence:</span>
                    <span className="font-mono">{Math.max(...peaks.map(p => p.delta)).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Avg Confidence:</span>
                    <span className="font-mono">{((peaks.reduce((sum, p) => sum + p.confidence, 0) / peaks.length) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">High Confidence (≥70%):</span>
                    <span className="font-mono">{peaks.filter(p => p.confidence >= 0.7).length}</span>
                  </div>
                </div>
              </div>

              {/* Top Peaks List */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Top Peaks (by Confidence)</h3>
                <div className="max-h-64 overflow-auto space-y-2">
                  {peaks.slice(0, 10).map((peak, i) => (
                    <div 
                      key={i}
                      className="p-3 rounded border border-[#1f1f2c] bg-[#11111a] text-xs"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono">#{peak.index}</span>
                        <span className="opacity-60">Conf: {(peak.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="opacity-60">Δ: {peak.delta.toFixed(4)}</span>
                        <span className="opacity-60">Prom: {peak.prominence.toFixed(4)}</span>
                        <span className="opacity-60">W: {peak.width}</span>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
