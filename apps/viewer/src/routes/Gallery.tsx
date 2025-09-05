import React, { useState } from "react";

interface Run {
  id: string;
  kernel: string;
  args: any;
  addr: string;
  result?: any;
  timestamp: number;
}

interface GalleryProps {
  runs: Run[];
}

export function Gallery({ runs }: GalleryProps) {
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [filter, setFilter] = useState<string>("");

  const filteredRuns = runs.filter(run => 
    run.kernel.toLowerCase().includes(filter.toLowerCase()) ||
    run.addr.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TGO Experiment Gallery</h1>
        
        <div className="mb-6">
          <input
            type="text"
            placeholder="Filter runs by kernel or address..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRuns.map((run) => (
            <div
              key={run.id}
              className="bg-zinc-800 rounded-lg p-4 cursor-pointer hover:bg-zinc-700 transition-colors"
              onClick={() => setSelectedRun(run)}
            >
              <div className="font-semibold text-cyan-300">{run.kernel}</div>
              <div className="text-sm text-zinc-400 mt-1">{run.addr}</div>
              <div className="text-xs text-zinc-500 mt-2">
                {new Date(run.timestamp).toLocaleString()}
              </div>
              {run.result && (
                <div className="mt-2 text-xs text-zinc-300">
                  Result: {JSON.stringify(run.result).slice(0, 50)}...
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedRun && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedRun.kernel}</h2>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="font-semibold text-cyan-300">Address</div>
                  <div className="text-sm font-mono">{selectedRun.addr}</div>
                </div>
                
                <div>
                  <div className="font-semibold text-cyan-300">Arguments</div>
                  <pre className="text-sm bg-zinc-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedRun.args, null, 2)}
                  </pre>
                </div>
                
                {selectedRun.result && (
                  <div>
                    <div className="font-semibold text-cyan-300">Result</div>
                    <pre className="text-sm bg-zinc-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedRun.result, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div>
                  <div className="font-semibold text-cyan-300">Timestamp</div>
                  <div className="text-sm">{new Date(selectedRun.timestamp).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
