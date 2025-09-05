import React from 'react';
import { useTGOStore } from "../../../../../src/state/tgoStore";

export function AnswerPanel() {
  const { answer, bounds } = useTGOStore();
  return (
    <div className="rounded border border-[#1e1e2a] p-3">
      <div className="text-sm opacity-80 mb-1">Answer</div>
      <div className="font-mono text-lg text-[#e9e9f0]">
        {answer ?? '—'}
      </div>
      {bounds && (
        <div className="text-xs opacity-70 mt-1 text-[#e9e9f0]">
          Bounds: [{bounds.lo}, {bounds.hi}]
        </div>
      )}
    </div>
  );
}
