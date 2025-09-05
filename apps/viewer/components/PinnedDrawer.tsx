import { useState, useEffect } from "react";

export function PinnedDrawer({ observer, onJump }: { observer: any; onJump: (addr: string)=>void }) {
  const [pins, setPins] = useState<{ addr: string; kernel: string; result: unknown; t: number }[]>([]);
  
  useEffect(() => {
    observer.on("pinned", ({ addr, payload }: any) => {
      setPins(p => [{ addr, kernel: payload.meta.kernel, result: payload.result, t: Date.now() }, ...p].slice(0, 200));
    });
  }, []);
  
  return (
    <div className="fixed right-3 bottom-3 w-96 max-h-[60vh] overflow-auto rounded-2xl bg-zinc-900/80 backdrop-blur p-3 shadow-xl">
      <div className="text-zinc-200 font-semibold mb-2">📌 Pinned Results</div>
      <ul className="space-y-2">
        {pins.map((p, i) => (
          <li key={i} className="bg-zinc-800/60 rounded-xl p-2">
            <div className="text-xs text-zinc-400">{new Date(p.t).toLocaleTimeString()} • {p.kernel}</div>
            <button className="text-cyan-300 hover:underline" onClick={() => onJump(p.addr)}>{p.addr}</button>
            <pre className="text-xs text-zinc-200 overflow-x-auto mt-1">{JSON.stringify(p.result)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
