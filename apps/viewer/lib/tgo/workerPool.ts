type Msg = { op:any; params:any; batch:number; jobSeed:string; tick:number; };

export class WorkerPool {
  private pool: Worker[] = [];
  private q: {resolve:(v:any)=>void, id:number}[] = [];
  private id = 0;

  constructor(size = Math.max(2, navigator.hardwareConcurrency ? Math.floor(navigator.hardwareConcurrency/2) : 4)) {
    for (let i=0;i<size;i++){
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type:'module' });
      w.onmessage = (e)=> {
        const { id, out } = e.data;
        const item = this.q.find(x=>x.id===id);
        if (item) item.resolve(out);
      };
      this.pool.push(w);
    }
  }

  exec(msg: Omit<Msg,'id'>): Promise<any> {
    const id = ++this.id;
    const w = this.pool[id % this.pool.length];
    if (!w) throw new Error('No workers available');
    return new Promise(resolve=>{
      this.q.push({ resolve, id });
      w.postMessage({ ...msg, id });
    });
  }

  destroy(){ this.pool.forEach(w=>w.terminate()); this.pool=[]; this.q=[]; }
}
