import { performance } from "node:perf_hooks"; 
(globalThis as any).performance ??= performance as any;

if (typeof globalThis.requestAnimationFrame !== "function") {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => 
    setTimeout(() => cb(Date.now()), 16) as unknown as number;
}
