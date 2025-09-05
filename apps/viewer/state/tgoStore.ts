import { create } from 'zustand';
import { Scheduler, type FEG } from '@/lib/tgo/scheduler';
import { pinReducerState, readPinnedState } from '@/lib/glyphTorus';

type Metrics = { convergence: number; throughput: number; tick: number; };
type Bounds = { lo: number; hi: number; };

type State = {
  status: 'idle'|'running'|'stopped';
  metrics: Metrics;
  answer: string|null;
  bounds: Bounds|null;
  _scheduler?: Scheduler;
  runJob: (feg: FEG)=>void;
  stopJob: ()=>void;
};

export const useTGOStore = create<State>((set,get)=>({
  status: 'idle',
  answer: null,
  bounds: null,
  metrics: { convergence: 0, throughput: 0, tick: 0 },

  runJob: (feg) => {
    get()._scheduler?.stop();
    const sched = new Scheduler({
      onMetrics(m){ set({metrics:m}); },
      onAnswer(a,b){ set({answer:a, bounds:b??null}); pinReducerState(feg.jobId, { answer:a, bounds:b, when: Date.now() }); },
      onStop(){ set({status:'stopped'}); },
    });
    set({ _scheduler: sched, status:'running', answer: null, bounds: null });
    // optional: warm-start from torus pin if exists
    const warm = readPinnedState(feg.jobId);
    if (warm) set({ answer: warm.answer, bounds: warm.bounds });
    sched.run(feg);
  },

  stopJob: ()=>{ get()._scheduler?.stop(); set({status:'stopped'}); }
}));
