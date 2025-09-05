export interface DeterminismHeader {
  planner: { name: string; version: string };
  mapper: { name: string; version: string };
  geometry: { name: string; vertices: number; faces: number; levels: number };
  exact: boolean;
}

export function makeDeterminismHeader(opts: DeterminismHeader) { 
  return { __tgo__: { determinism: opts } }; 
}
