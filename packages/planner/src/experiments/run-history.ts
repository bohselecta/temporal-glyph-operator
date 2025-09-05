import type { Run } from "./divergence";

export interface RunHistory {
  runs: Run[];
  addRun(run: Run): void;
  getRuns(): Run[];
  clear(): void;
}

export class InMemoryRunHistory implements RunHistory {
  runs: Run[] = [];
  
  addRun(run: Run) {
    this.runs.push(run);
  }
  
  getRuns(): Run[] {
    return [...this.runs];
  }
  
  clear() {
    this.runs = [];
  }
}

/**
 * Bind run history to an observer to capture pinned events
 */
export function bindHistory(history: RunHistory, observer: any) {
  observer.on("pinned", (data: any) => {
    const strategy = data.payload?.meta?.strategy || data.payload?.meta?.policy || "unknown";
    const value = typeof data.payload?.result === "number" 
      ? data.payload.result 
      : data.payload?.result?.value || 0;
    
    history.addRun({
      t: Date.now(),
      strategy,
      value
    });
  });
}
