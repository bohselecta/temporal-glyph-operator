import { useEffect, useRef, useState } from "react";

export function useDriveHeat() {
  const heat = useRef<Map<string, number>>(new Map());
  const [, setTick] = useState(0);

  // decay + UI tick
  useEffect(() => {
    const id = setInterval(() => {
      for (const [k,v] of heat.current) {
        const nv = v * 0.92; // decay
        if (nv < 0.01) heat.current.delete(k); else heat.current.set(k, nv);
      }
      setTick(t => t+1);
    }, 250);
    return () => clearInterval(id);
  }, []);

  return {
    bump(addr: string, amt = 1) {
      const v = heat.current.get(addr) ?? 0;
      heat.current.set(addr, Math.min(v + amt, 5));
    },
    get(addr: string) { return heat.current.get(addr) ?? 0; }
  };
}
