// Durable storage for TGO computer results using localStorage
type Pin = { answer:string|null, bounds:any, when:number };
const KEY = 'tgo_pins_v1';

function loadMap(): Map<string,Pin> {
  try { return new Map<string,Pin>(JSON.parse(localStorage.getItem(KEY) || '[]')); }
  catch { return new Map(); }
}
function saveMap(m:Map<string,Pin>){ localStorage.setItem(KEY, JSON.stringify([...m.entries()])); }

const PINS = loadMap();

export function pinReducerState(jobId:string, pin:Pin){ 
  PINS.set(jobId, { ...pin, when: Date.now() }); 
  saveMap(PINS); 
}

export function readPinnedState(jobId:string){ 
  return PINS.get(jobId); 
}

export function listPins(limit=25){ 
  return [...PINS.entries()].sort((a,b)=>b[1].when-a[1].when).slice(0,limit); 
}
