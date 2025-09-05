import { useMemo } from "react";

export function CSVButton({ rows, filename }: { rows: any[]; filename: string }) {
  const href = useMemo(() => {
    const keys = Array.from(
      rows.reduce((s, r) => {
        Object.keys(r).forEach(k => s.add(k));
        return s;
      }, new Set<string>()).values()
    );
    const header = keys.join(",");
    const body = rows.map(r => 
      keys.map(k => JSON.stringify((r as any)[k] ?? "")).join(",")
    ).join("\n");
    const csv = header + "\n" + body;
    return URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  }, [rows]);
  
  return (
    <a 
      download={filename} 
      href={href} 
      className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
    >
      Export CSV
    </a>
  );
}
