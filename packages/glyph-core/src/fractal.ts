export type Vec = { x: number; y: number };
export type Address = string; // e.g., "ABCACB..." in Sierpinski sub-triangle code
const SQRT3 = Math.sqrt(3);

export const A: Vec = { x: 0, y: 0 };
export const B: Vec = { x: 1, y: 0 };
export const C: Vec = { x: 0.5, y: SQRT3 / 2 };

function midpoint(p: Vec, q: Vec): Vec {
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

export function addressToPoint(code: Address): Vec {
  let pA = A, pB = B, pC = C;
  for (const ch of code) {
    const ab = midpoint(pA, pB), bc = midpoint(pB, pC), ca = midpoint(pC, pA);
    if (ch === "A")       { pB = ab; pC = ca; }
    else if (ch === "B")  { pA = ab; pC = bc; }
    else if (ch === "C")  { pA = ca; pB = bc; }
    else { throw new Error(`Invalid address char: ${ch}`); }
  }
  // centroid of current refined triangle
  return { x: (pA.x + pB.x + pC.x) / 3, y: (pA.y + pB.y + pC.y) / 3 };
}

export function triIndexAt(x: number, y: number, depth: number): Address {
  // maps normalized (x,y) in unit triangle to an address of given depth
  let addr = "";
  let pA = A, pB = B, pC = C;
  for (let i = 0; i < depth; i++) {
    const ab = midpoint(pA, pB), bc = midpoint(pB, pC), ca = midpoint(pC, pA);
    // barycentric check by area signs
    const inA = pointInTriangle({x,y}, pA, ab, ca);
    const inB = pointInTriangle({x,y}, ab, pB, bc);
    const inC = pointInTriangle({x,y}, ca, bc, pC);
    if (inA) { addr += "A"; pB = ab; pC = ca; }
    else if (inB) { addr += "B"; pA = ab; pC = bc; }
    else if (inC) { addr += "C"; pA = ca; pB = bc; }
    else break;
  }
  return addr;
}

function sign(p1: Vec, p2: Vec, p3: Vec) {
  return (p1.x - p3.x)*(p2.y - p3.y) - (p2.x - p3.x)*(p1.y - p3.y);
}
function pointInTriangle(p: Vec, a: Vec, b: Vec, c: Vec) {
  const s1 = sign(p, a, b), s2 = sign(p, b, c), s3 = sign(p, c, a);
  const hasNeg = (s1 < 0) || (s2 < 0) || (s3 < 0);
  const hasPos = (s1 > 0) || (s2 > 0) || (s3 > 0);
  return !(hasNeg && hasPos);
}
