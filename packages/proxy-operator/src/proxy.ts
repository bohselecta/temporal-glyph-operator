import { FrameBus, type Frame } from "@glyph/core";
import { sampleFrame } from "@glyph/viewport-manager";
import { generateReport, type Report } from "@glyph/report-engine";

export type ProxyConfig = {
  levels?: number;
  reportEveryMs?: number;
  ringSize?: number;
  adaptiveCadence?: {
    enabled: boolean;
    fastMs: number;    // fast cadence when high energy
    slowMs: number;    // slow cadence when low energy
    hiEnergy: number;  // energy threshold for fast mode
    loEnergy: number;  // energy threshold for slow mode
  };
};
export type ProxyEvent =
  | { type: "report"; report: Report }
  | { type: "error"; error: unknown }
  | { type: "cadence"; ms: number; reason: "energy_high" | "energy_low" | "manual" };

type Listener = (e: ProxyEvent) => void;

export class SimulatedProxyOperator {
  #cfg: Required<ProxyConfig>;
  #unsubscribe: (() => void) | undefined = undefined;
  #listeners = new Set<Listener>();
  #buffer: Frame[] = [];
  #stabilityS: number = 0;
  #motifHistory: string[][] = [];
  #currentCadence: number;

  constructor(private bus: FrameBus, cfg: ProxyConfig = {}) {
    const adaptiveCadence = cfg.adaptiveCadence ?? {
      enabled: false,
      fastMs: 120,
      slowMs: 500,
      hiEnergy: 48,
      loEnergy: 18
    };
    
    this.#cfg = { 
      levels: cfg.levels ?? 4, 
      reportEveryMs: cfg.reportEveryMs ?? 250, 
      ringSize: cfg.ringSize ?? 16,
      adaptiveCadence
    };
    this.#currentCadence = this.#cfg.reportEveryMs;
  }

  setStabilityS(s: number) {
    this.#stabilityS = s;
  }

  start() {
    if (this.#unsubscribe) return;
    let lastReport = performance.now();
    this.#unsubscribe = this.bus.subscribe((f) => {
      // ring buffer
      this.#buffer.push(f);
      if (this.#buffer.length > this.#cfg.ringSize) this.#buffer.shift();
      const now = performance.now();
      if (now - lastReport >= this.#currentCadence) {
        lastReport = now;
        try {
          const latest = this.#buffer[this.#buffer.length - 1];
          if (latest) {
            const samples = sampleFrame(latest, this.#cfg.levels);
            const report = generateReport(samples, latest.t, this.#currentCadence, this.#motifHistory, this.#stabilityS);
            
            // Update motif history for evidence computation
            const currentMotifs = report.observations.map(o => o.motif);
            this.#motifHistory.push(currentMotifs);
            if (this.#motifHistory.length > 20) {
              this.#motifHistory.shift(); // keep last 20 windows
            }
            
            // Update adaptive cadence based on energy
            if (this.#cfg.adaptiveCadence.enabled) {
              const avgEnergy = samples[0]?.energy ?? 0;
              const newCadence = this.#adaptCadence(avgEnergy);
              if (newCadence !== this.#currentCadence) {
                this.#currentCadence = newCadence;
                this.#emit({ 
                  type: "cadence", 
                  ms: newCadence, 
                  reason: avgEnergy >= this.#cfg.adaptiveCadence.hiEnergy ? "energy_high" : "energy_low" 
                });
              }
            }
            
            this.#emit({ type: "report", report });
          }
        } catch (e) {
          this.#emit({ type: "error", error: e });
        }
      }
    });
  }

  #adaptCadence(energy: number): number {
    const { fastMs, slowMs, hiEnergy, loEnergy } = this.#cfg.adaptiveCadence;
    
    if (energy >= hiEnergy) {
      return fastMs;
    } else if (energy <= loEnergy) {
      return slowMs;
    }
    
    // Hysteresis: keep current cadence if in middle range
    return this.#currentCadence;
  }

  stop() { 
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = undefined;
    }
  }
  on(l: Listener) { this.#listeners.add(l); return () => this.#listeners.delete(l); }
  #emit(e: ProxyEvent) { this.#listeners.forEach(h => h(e)); }
}
