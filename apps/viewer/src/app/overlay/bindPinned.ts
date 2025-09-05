import type { DriveMesh } from "../../scene/DriveMesh";

export function bindPinned(observer: any, driveMesh: DriveMesh) {
  observer.on("pinned", ({ addr }: { addr: string }) => {
    driveMesh.bump(addr, 0.6);
  });
  // Decay loop
  setInterval(() => driveMesh.decay(0.92), 250);
}
