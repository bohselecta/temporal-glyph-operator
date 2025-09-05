import { useRef } from "react";
import { reattachPinsFromLDJSON } from "@glyph/adapters/src/import/ldjson";

export function ImportLDJSON({ drive }: { drive: any }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="fixed left-3 bottom-3 p-2 bg-zinc-900/80 rounded-xl">
      <button 
        className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sm" 
        onClick={() => ref.current?.click()}
      >
        Import session
      </button>
      <input 
        ref={ref} 
        type="file" 
        accept=".ldjson,.jsonl,.log" 
        className="hidden"
        aria-label="Import LDJSON session file"
        onChange={async (e) => {
          const f = e.target.files?.[0]; 
          if (!f) return;
          await reattachPinsFromLDJSON(f, drive);
          alert("Import complete: pins reattached");
        }} 
      />
    </div>
  );
}
