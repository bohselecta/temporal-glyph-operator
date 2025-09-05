import React, { useState, useEffect } from 'react';
import { InputConsole } from './console/InputConsole';
import { AnswerPanel } from './console/AnswerPanel';
import { FractalCanvas } from './viz/FractalCanvas';
import { useTGOStore } from '@/state/tgoStore';
import { listPins } from '@/lib/glyphTorus';

export function TGOApp() {
  const { status, metrics } = useTGOStore();
  const [pins, setPins] = useState<Array<[string, {answer:string|null, bounds:any, when:number}]>>([]);
  const [showPins, setShowPins] = useState(false);

  useEffect(() => {
    setPins(listPins());
  }, []);

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-6">
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <img src="/tgo-logo.png" alt="TGO" className="w-3 h-3 rounded-xl shadow" />
          <h1 className="text-xl font-semibold">Temporal Glyph Operator</h1>
        </div>
        <InputConsole />
        <AnswerPanel />
        <div className="rounded border border-[#1e1e2a] p-3 text-sm">
          <div className="flex justify-between">
            <span>Status: <b>{status}</b></span>
            <span>Convergence: <b>{(metrics.convergence*100).toFixed(1)}%</b></span>
          </div>
          <div>Throughput: {metrics.throughput.toLocaleString()} ops/s • Tick: {metrics.tick}</div>
        </div>
        
        {/* Pins Drawer */}
        <div className="rounded border border-[#1e1e2a] p-3">
          <button 
            onClick={() => setShowPins(!showPins)}
            className="text-sm font-medium text-neutral-400 hover:text-neutral-200 mb-2"
          >
            📌 Pins ({pins.length}) {showPins ? '▼' : '▶'}
          </button>
          {showPins && (
            <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {pins.map(([id, p]) => (
                <li key={id} className="flex gap-2 items-center text-neutral-400">
                  <span className="opacity-60">{new Date(p.when).toLocaleTimeString()}</span>
                  <code className="truncate text-neutral-300">{p.answer || 'running...'}</code>
                </li>
              ))}
              {pins.length === 0 && (
                <li className="text-neutral-500 italic">No pinned results yet</li>
              )}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded border border-[#1e1e2a] overflow-hidden">
        <FractalCanvas />
      </section>
    </div>
  );
}
