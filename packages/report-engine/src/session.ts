/**
 * Session Recording & Replay — Research Rigor Pack
 * 
 * Captures complete experimental runs (frames + reports) for:
 * - Reproducible research
 * - Offline analysis
 * - Strategy comparison
 * - Paper-style documentation
 */

export type SessionEvent = 
  | { type: 'frame'; frame: { t: number; layer: number; width: number; height: number; data: Uint8Array } }
  | { type: 'report'; report: any }; // Use any to avoid circular deps

export type Session = {
  started: number;
  ended?: number;
  events: SessionEvent[];
  metadata?: {
    version: string;
    config: Record<string, any>;
    strategies?: string[];
  };
};

/**
 * Session recorder for capturing experimental runs
 */
export class SessionRecorder {
  private events: SessionEvent[] = [];
  private started: number = Date.now();

  push(event: SessionEvent) {
    this.events.push(event);
  }

  finish(): Session {
    return {
      started: this.started,
      ended: Date.now(),
      events: [...this.events],
      metadata: {
        version: '1.0.0',
        config: {},
        strategies: []
      }
    };
  }

  exportLDJSON(): string {
    const session = this.finish();
    return session.events.map(ev => JSON.stringify(ev)).join('\n');
  }

  exportJSON(): string {
    return JSON.stringify(this.finish(), null, 2);
  }

  clear() {
    this.events = [];
    this.started = Date.now();
  }
}

/**
 * Create a new session recorder
 */
export function recordSession(): SessionRecorder {
  return new SessionRecorder();
}

/**
 * Replay a session from LDJSON format
 */
export function replaySession(ldjsonText: string): Session {
  const events: SessionEvent[] = [];
  const lines = ldjsonText.trim().split('\n');
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const event = JSON.parse(line) as SessionEvent;
        events.push(event);
      } catch (e) {
        console.warn('Failed to parse session event:', line);
      }
    }
  }

  const lastEvent = events[events.length - 1];
  return {
    started: events[0]?.type === 'frame' ? (events[0] as any).frame.t : Date.now(),
    ended: lastEvent?.type === 'frame' ? (lastEvent as any).frame.t : Date.now(),
    events,
    metadata: {
      version: '1.0.0',
      config: {},
      strategies: []
    }
  };
}

/**
 * Extract convergence series from session events
 */
export function extractConvergenceSeries(session: Session): { uniform: number[]; energyBiased: number[]; divergence: number[] } {
  const uniform: number[] = [];
  const energyBiased: number[] = [];
  const divergence: number[] = [];

  for (const event of session.events) {
    if (event.type === 'report' && event.report?.metrics?.convergence !== undefined) {
      const conv = event.report.metrics.convergence;
      
      // Heuristic: alternate between strategies (can be improved with explicit strategy tags)
      if (uniform.length <= energyBiased.length) {
        uniform.push(conv);
      } else {
        energyBiased.push(conv);
      }

      // Calculate divergence
      const u = uniform[uniform.length - 1] ?? conv;
      const e = energyBiased[energyBiased.length - 1] ?? conv;
      divergence.push(Math.abs(u - e));
    }
  }

  return { uniform, energyBiased, divergence };
}

/**
 * Find peak divergence intervals
 */
export function findPeakDivergence(divergence: number[], threshold: number = 0.1): Array<{ start: number; end: number; peak: number; value: number }> {
  const peaks: Array<{ start: number; end: number; peak: number; value: number }> = [];
  let inPeak = false;
  let peakStart = 0;
  let peakValue = 0;
  let peakIndex = 0;

  for (let i = 0; i < divergence.length; i++) {
    const val = divergence[i] ?? 0;
    
    if (val >= threshold) {
      if (!inPeak) {
        inPeak = true;
        peakStart = i;
        peakValue = val;
        peakIndex = i;
      } else if (val > peakValue) {
        peakValue = val;
        peakIndex = i;
      }
    } else if (inPeak) {
      inPeak = false;
      peaks.push({
        start: peakStart,
        end: i - 1,
        peak: peakIndex,
        value: peakValue
      });
    }
  }

  // Handle case where peak extends to end
  if (inPeak) {
    peaks.push({
      start: peakStart,
      end: divergence.length - 1,
      peak: peakIndex,
      value: peakValue
    });
  }

  return peaks.sort((a, b) => b.value - a.value);
}
