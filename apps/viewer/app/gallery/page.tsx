"use client";

import { Gallery } from "../../src/routes/Gallery";

export default function GalleryPage() {
  // In a real app, this would fetch from an API or state management
  const runs = [
    {
      id: "pi-1",
      kernel: "pi",
      args: { trials: 1000000 },
      addr: "A:2:c=1:c=0",
      result: { pi: 3.141592, error: 0.000001 },
      timestamp: Date.now() - 3600000
    },
    {
      id: "sum-1", 
      kernel: "sum",
      args: { range: [1, 1000000] },
      addr: "B:1:c=2",
      result: { sum: 500000500000 },
      timestamp: Date.now() - 1800000
    }
  ];

  return <Gallery runs={runs} />;
}
