export type Frame = {
  t: number;                // ms
  layer: number;            // logical depth
  width: number;
  height: number;
  pixels: Uint8ClampedArray;// RGBA
  meta?: Record<string, unknown>;
};

type Listener = (f: Frame) => void;

export class FrameBus {
  private listeners = new Set<Listener>();
  emit(frame: Frame) { this.listeners.forEach(h => h(frame)); }
  subscribe(h: Listener) { this.listeners.add(h); return () => this.listeners.delete(h); }
}
