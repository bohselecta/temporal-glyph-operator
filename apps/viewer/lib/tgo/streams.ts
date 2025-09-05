export async function* fetchChunks(url:string, chunkSize=1<<20){
  const res = await fetch(url);
  const reader = res.body!.getReader();
  while (true){
    const { value, done } = await reader.read();
    if (done) break;
    yield value!;
  }
}

export function sliceByAddress(addr:number, chunkSize=1<<20){
  const start = addr * chunkSize;
  const end = start + chunkSize;
  return { start, end };
}
