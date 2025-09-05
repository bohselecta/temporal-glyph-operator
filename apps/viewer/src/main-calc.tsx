// ──────────────────────────────────────────────────────────────────────────────
// apps/viewer/src/main-calc.tsx
// Standalone dev entry that mounts the Calculator and renders top nav.
// (Use alongside existing entries; prod router can mount this at /calc.)
// ──────────────────────────────────────────────────────────────────────────────
import React from "react";
import { createRoot } from "react-dom/client";
import CalcCompare from "./routes/CalcCompare";

const root = createRoot(document.getElementById("tgo-canvas")!);
root.render(<CalcCompare />);
