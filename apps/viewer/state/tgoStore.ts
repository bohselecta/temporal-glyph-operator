import { create } from 'zustand';
import { Scheduler, type FEG } from '@/lib/tgo/scheduler';
import { pinReducerState, readPinnedState } from '@/lib/glyphTorus';
import { TapeAdapter } from '@glyph/adapters';
import { drive } from '@glyph/glyph-drive';

type Metrics = { convergence: number; throughput: number; tick: number; };
type Bounds = { lo: number; hi: number; };

type State = {
  status: 'idle'|'running'|'stopped';
  metrics: Metrics;
  answer: string|null;
  bounds: Bounds|null;
  _scheduler?: Scheduler;
  _adapter?: TapeAdapter;
  observer: { on: Function; emit: Function };
  runJob: (feg: FEG)=>void;
  stopJob: ()=>void;
};

export const useTGOStore = create<State>((set,get)=>({
  status: 'idle',
  answer: null,
  bounds: null,
  metrics: { convergence: 0, throughput: 0, tick: 0 },
  observer: { on: () => {}, emit: () => {} },

            runJob: (feg) => {
            get()._scheduler?.stop();

            // Create observer for adapter
            const observer = { on: () => {}, emit: () => {} };

            // Create tape adapter
            const adapter = new TapeAdapter(drive, observer, feg.jobId);
    
                const sched = new Scheduler({
              onMetrics(m){ set({metrics:m}); },
              onAnswer(a,b){ 
                set({answer:a, bounds:b??null}); 
                pinReducerState(feg.jobId, { answer:a, bounds:b, when: Date.now() });

                // Emit finalize event for tape adapter
                observer.emit('finalize', {
                  jobId: feg.jobId,
                  result: a,
                  meta: {
                    jobId: feg.jobId,
                    kernel: feg.nodes[0]?.op || 'unknown',
                    createdAt: Date.now(),
                    exact: false,
                    seed: feg.jobId,
                    bounds: b
                  }
                });
              },
              onStop(){ set({status:'stopped'}); },
            });
    
                // Bind tape adapter to scheduler
            adapter.bind(sched);
    
    set({ _scheduler: sched, _adapter: adapter, observer, status:'running', answer: null, bounds: null });
    
    // optional: warm-start from torus pin if exists
    const warm = readPinnedState(feg.jobId);
    if (warm) set({ answer: warm.answer, bounds: warm.bounds });
    sched.run(feg);
  },

  stopJob: ()=>{ get()._scheduler?.stop(); set({status:'stopped'}); }
}));
