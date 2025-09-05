import { runBatch } from "./run-batch";
import { uniformPolicy, energyBiasedPolicy } from "@glyph/address-mapper";

/**
 * Demo sweeps for testing the strategy lab
 */
export async function demoSweeps(submit: (job: any) => Promise<void>) {
  console.log("Starting demo sweeps...");
  
  // Uniform policy sweep
  await runBatch({
    kernel: "pi",
    params: [
      { name: "trials", values: [1e6, 5e6, 1e7] },
      { name: "seedOffset", values: [0, 1, 2] }
    ],
    repeats: 2
  }, {
    seed: "uniform-demo",
    depth: 2,
    policy: uniformPolicy,
    submit: async (job) => {
      await submit({
        ...job,
        payload: {
          result: Math.PI + (Math.random() - 0.5) * 0.01,
          meta: { strategy: "uniform", ...job.args }
        }
      });
    }
  });
  
  // Energy-biased policy sweep
  await runBatch({
    kernel: "sum",
    params: [
      { name: "n", values: [1e6, 5e6, 1e7] },
    ]
  }, {
    seed: "energy-demo",
    depth: 2,
    policy: energyBiasedPolicy,
    submit: async (job) => {
      await submit({
        ...job,
        payload: {
          result: (job.args.n * (job.args.n + 1)) / 2 + (Math.random() - 0.5) * 1000,
          meta: { strategy: "energy", ...job.args }
        }
      });
    }
  });
  
  console.log("Demo sweeps completed!");
}
