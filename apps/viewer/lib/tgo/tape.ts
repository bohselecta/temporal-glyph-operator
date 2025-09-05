// simple counter-based PRNG: SplitMix64-ish to keep deterministic per (seed,tick)
function hash64(n:bigint){
  n = (n ^ (n >> 30n)) * 0xbf58476d1ce4e5b9n;
  n = (n ^ (n >> 27n)) * 0x94d049bb133111ebn;
  n = n ^ (n >> 31n);
  return n & ((1n<<64n)-1n);
}

export function addrPRNG(jobSeed:string, tick:number){
  const seedBig = BigInt.asUintN(64, BigInt('0x'+toHex(jobSeed)) ^ BigInt(tick));
  let ctr = seedBig;
  return function next(){
    ctr = (ctr + 0x9E3779B97F4A7C15n) & ((1n<<64n)-1n);
    const h = hash64(ctr);
    // scale to [0,1)
    return Number(h) / 2**64;
  }
}

function toHex(s:string){
  let out=''; for (let i=0;i<s.length;i++){ out += s.charCodeAt(i).toString(16).padStart(2,'0'); }
  return out.slice(0,16) || '00';
}
