import { performance } from "node:perf_hooks";

// Replace with actual imports in your repo
const mapper = { locate: (id) => `A:${(id.length%3)+1}:A0:child=${(id.length%3)+1}` };
const drive = { attachPayload: () => {} };

const N = 10000;
let t0 = performance.now();
for (let i=0;i<N;i++) mapper.locate("job-"+i);
let t1 = performance.now();
console.log("AddressMapper.locate P95 target <0.3ms — elapsed:", (t1-t0).toFixed(2), "ms for", N);

// naive attach benchmark
const payload = { result: 0, meta: { jobId: "x", kernel: "k", createdAt: Date.now(), exact:false, seed:"s" } };
t0 = performance.now();
for (let i=0;i<N;i++) drive.attachPayload("A:1:A0:child=1", payload);
t1 = performance.now();
console.log("Drive.attachPayload P95 target <1ms — elapsed:", (t1-t0).toFixed(2), "ms for", N);
