import { runCalc, type CalcJob } from "@glyph/kernels";

/**
 * TGO Planner Job Interface
 */
interface PlannerJob {
  jobId: string;
  kernel: string;
  payload: {
    expression?: string;
    meta?: Record<string, unknown>;
  };
}

/**
 * TGO Observer Event Interface
 */
interface ObserverEvent {
  jobId: string;
  payload: {
    result: unknown;
    meta: {
      kernel: string;
      strategy?: string;
      timestamp: number;
      [key: string]: unknown;
    };
  };
}

/**
 * Simple Event Emitter for Observer
 */
class SimpleEventEmitter {
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Expose internal emit for planner use
  _emit = this.emit.bind(this);
}

/**
 * Registry of available kernels
 */
const kernels: Record<string, (job: PlannerJob) => Promise<any>> = {
  calc: async (job: PlannerJob) => {
    const calcJob: CalcJob = {
      jobId: job.jobId,
      args: { expr: job.payload.expression || "" }
    };
    return await runCalc(calcJob);
  },
  // Add other kernels here as needed
};

/**
 * TGO Planner Implementation
 */
export const planner = {
  async submit(job: PlannerJob): Promise<string> {
    const kernelFn = kernels[job.kernel];
    if (!kernelFn) {
      throw new Error(`Unknown kernel: ${job.kernel}`);
    }

    try {
      // Run kernel (synchronously for now - could be moved to WebWorker)
      const result = await kernelFn(job);
      
      // Emit observer event asynchronously
      setTimeout(() => {
        const event: ObserverEvent = {
          jobId: job.jobId,
          payload: {
            result: result.result,
            meta: {
              ...result.meta,
              kernel: job.kernel,
              strategy: result.meta.strategy || "tgo-kernel",
              timestamp: Date.now()
            }
          }
        };
        
        // Emit to observer
        observer._emit("pinned", event);
      }, 0);

      return job.jobId;
    } catch (error) {
      // Emit error event
      setTimeout(() => {
        const errorEvent: ObserverEvent = {
          jobId: job.jobId,
          payload: {
            result: null,
            meta: {
              kernel: job.kernel,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: Date.now()
            }
          }
        };
        observer._emit("pinned", errorEvent);
      }, 0);
      
      throw error;
    }
  }
};

/**
 * TGO Observer Implementation
 */
export const observer = new SimpleEventEmitter();

/**
 * Initialize TGO system by exposing planner and observer to global scope
 */
export function initializeTGO(): void {
  if (typeof window !== 'undefined') {
    // Make planner discoverable to calculator page
    (window as any).__TGO_PLANNER__ = planner;
    
    // Make observer discoverable to calculator page  
    (window as any).__TGO_OBSERVER__ = observer;
    
    console.log('TGO system initialized with calc kernel');
  }
}
