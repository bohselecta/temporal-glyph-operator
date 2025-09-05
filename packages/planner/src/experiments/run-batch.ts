import { generateGrid, type ExperimentSpec } from "./batch";
import { locateWithPolicy, uniformPolicy } from "@glyph/address-mapper";

export async function runBatch(
  spec: ExperimentSpec, 
  opts: { 
    seed: string; 
    depth?: number; 
    policy?: typeof uniformPolicy; 
    submit: (job: { jobId: string; kernel: string; args: any; addr: string }) => Promise<void> 
  }
) {
  const jobs = generateGrid(spec);
  const policy = opts.policy ?? uniformPolicy;
  
  for (const j of jobs) {
    const addr = locateWithPolicy(policy, { 
      seed: opts.seed, 
      jobId: j.jobId, 
      args: j.args 
    }, opts.depth ?? 0);
    
    await opts.submit({ ...j, addr });
  }
}
