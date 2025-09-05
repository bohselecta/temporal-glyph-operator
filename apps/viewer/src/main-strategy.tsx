import React from "react";
import { createRoot } from "react-dom/client";
import { StrategyLab } from "./routes/StrategyLab";

// Bind to observer if available
if (typeof window !== "undefined" && (window as any).__TGO_OBSERVER__) {
  const observer = (window as any).__TGO_OBSERVER__;
  console.log("Strategy Lab: Observer bound", observer);
  
  // You can add run history binding here
  // import { bindHistory, InMemoryRunHistory } from "@glyph/planner/src/experiments/run-history";
  // const history = new InMemoryRunHistory();
  // bindHistory(history, observer);
}

const root = createRoot(document.getElementById("tgo-canvas")!);
root.render(<StrategyLab />);
