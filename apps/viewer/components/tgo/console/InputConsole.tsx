import React, { useState } from 'react';
import { planFromPrompt } from "../../../../../src/lib/tgo/planner";
import { useTGOStore } from "../../../../../src/state/tgoStore";

const EXAMPLES = [
  'pi 10e7',                 // Monte Carlo
  'sum 1..1e9',              // streaming sum
  'sum! 1..1e7',             // exact sum with BigInt
  'meanvar 0..1 by 1e-6',    // mean & variance
  'fft 2^20',                // synthetic signal FFT
  'matmul 4096x4096 sparse 0.001 density', // sparse tile demo
  'sum url:/data/numbers.bin by 1', // stream from file
  'matmul url:/data/A.bin url:/data/B.bin 8192x8192' // matrix from files
];

export function InputConsole() {
  const [text, setText] = useState(EXAMPLES[0]);
  const { runJob, stopJob, status } = useTGOStore();

  function onRun() {
    if (!text) return;
    const feg = planFromPrompt(text);
    runJob(feg);
  }

  return (
    <div className="rounded border border-[#1e1e2a] p-3 space-y-3">
      <label className="block text-sm opacity-80">Task</label>
      <textarea
        className="w-full h-28 bg-[#0f0f18] border border-[#2a2a3a] rounded p-2 font-mono text-sm text-[#e9e9f0]"
        value={text} onChange={e => setText(e.target.value)}
        placeholder='e.g., "pi 10e7" or "sum 1..1e9"'
      />
      <div className="flex gap-2">
        <button onClick={onRun} disabled={status==='running'}
          className="px-3 py-2 rounded text-sm border text-black border-gray-300 hover:bg-gray-200 disabled:opacity-40 bg-[#f0f0f0]">
          Run
        </button>
        <button onClick={stopJob} disabled={status!=='running'}
          className="px-3 py-2 rounded text-sm border text-black border-gray-300 hover:bg-gray-200 bg-[#f0f0f0]">
          Stop
        </button>
        <div className="ml-auto text-sm opacity-70">Examples: {EXAMPLES.map((e,i)=>
          <button key={i} onClick={()=>setText(e)} className="underline decoration-dotted mx-1">{i+1}</button>)}
        </div>
      </div>
    </div>
  );
}
