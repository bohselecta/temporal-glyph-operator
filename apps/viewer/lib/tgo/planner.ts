import { type FEG, NodeOp } from './scheduler';

const planId = ()=> 'job_'+Math.random().toString(36).slice(2);

export function planFromPrompt(prompt: string): FEG {
  const p = prompt.trim().toLowerCase();

  // pi N
  if (p.startsWith('pi')) {
    const m = p.match(/pi\s+([\de\^\.]+)/);
    const samples = m ? parseExp(m[1]!) : 1e7;
    return {
      jobId: planId(),
      nodes: [{ id:'mc', op:NodeOp.MC_PI, params:{ samples } }],
      reducer: { kind:'pi' }
    };
  }

  // sum a..b (inclusive), optional step
  if (p.startsWith('sum')) {
    const m = p.match(/sum\s+([\d\.e\^]+)\s*\.\.\s*([\d\.e\^]+)(?:\s*by\s*([\d\.e\^]+))?/);
    if (m) {
      const a = parseExp(m[1]!), b = parseExp(m[2]!), step = m[3]?parseExp(m[3]!):1;
      return {
        jobId: planId(),
        nodes: [{ id:'sum', op:NodeOp.SUM_RANGE, params:{ a,b,step } }],
        reducer: { kind:'sum' }
      };
    }
    
    // sum! a..b (exact mode)
    const exactMatch = p.match(/sum!\s+([\d\.e\^]+)\s*\.\.\s*([\d\.e\^]+)(?:\s*by\s*([\d\.e\^]+))?/);
    if (exactMatch) {
      const a = parseExp(exactMatch[1]!), b = parseExp(exactMatch[2]!), step = exactMatch[3]?parseExp(exactMatch[3]!):1;
      return {
        jobId: planId(),
        nodes: [{ id:'sum', op:NodeOp.SUM_RANGE, params:{ a,b,step } }],
        reducer: { kind:'sum-exact' }
      };
    }
    
    // sum url:https://... by 1
    const urlMatch = p.match(/sum\s+url:([^\s]+)(?:\s*by\s*([\d\.e\^]+))?/);
    if (urlMatch) {
      const url = urlMatch[1]!, step = urlMatch[2]?parseExp(urlMatch[2]!):1;
      return {
        jobId: planId(),
        nodes: [{ id:'sum', op:NodeOp.SUM_RANGE, params:{ source:'url', url, step } }],
        reducer: { kind:'sum' }
      };
    }
  }

  // meanvar 0..1 by dx
  if (p.startsWith('meanvar')) {
    const m = p.match(/meanvar\s+([\d\.e\^]+)\s*\.\.\s*([\d\.e\^]+)(?:\s*by\s*([\d\.e\^]+))?/);
    if (m) {
      const a = parseExp(m[1]!), b = parseExp(m[2]!), step = m[3]?parseExp(m[3]!):1e-6;
      return {
        jobId: planId(),
        nodes: [{ id:'mv', op:NodeOp.MEANVAR_RANGE, params:{ a,b,step } }],
        reducer: { kind:'meanvar' }
      };
    }
  }

  // fft N (synthetic signal)
  if (p.startsWith('fft')) {
    const m = p.match(/fft\s+([\d\^\e]+)/);
    const n = m ? parseSize(m[1]!) : (1<<20);
    return {
      jobId: planId(),
      nodes: [{ id:'fft', op:NodeOp.FFT_SYNTH, params:{ n } }],
      reducer: { kind:'fft-energy' }
    };
  }

  // matmul MxN sparse d
  if (p.startsWith('matmul')) {
    const m = p.match(/matmul\s+(\d+)x(\d+)(?:\s+sparse\s+([\d\.]+)\s*density)?/);
    if (m) {
      const M = +m[1]!, N = +m[2]!, density = m[3]?+m[3]!:0.001;
      return {
        jobId: planId(),
        nodes: [{ id:'mm', op:NodeOp.MATMUL_SYNTH, params:{ M,N,density } }],
        reducer: { kind:'tile-sum' }
      };
    }
    
    // matmul url:A.bin url:B.bin 8192x8192
    const urlMatch = p.match(/matmul\s+url:([^\s]+)\s+url:([^\s]+)\s+(\d+)x(\d+)/);
    if (urlMatch) {
      const urlA = urlMatch[1]!, urlB = urlMatch[2]!, M = +urlMatch[3]!, N = +urlMatch[4]!;
      return {
        jobId: planId(),
        nodes: [{ id:'mm', op:NodeOp.MATMUL_SYNTH, params:{ source:'url', urlA, urlB, M, N } }],
        reducer: { kind:'tile-sum' }
      };
    }
  }

  // default: pi
  return {
    jobId: planId(),
    nodes: [{ id:'mc', op:NodeOp.MC_PI, params:{ samples: 1e7 } }],
    reducer: { kind:'pi' }
  };
}

function parseExp(s:string){ return Number(s.replace('^','e')); }
function parseSize(s:string){
  if (s.includes('^')) { const [b,p]=s.split('^').map(Number); return (b ?? 2)**(p ?? 1); }
  return Number(s);
}
