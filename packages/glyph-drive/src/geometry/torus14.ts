export type Vec3 = { x: number; y: number; z: number };
export type Tri = [Vec3, Vec3, Vec3];

function torusPoint(u: number, v: number, R = 2.0, r = 0.8) {
  const cu = Math.cos(u), su = Math.sin(u);
  const cv = Math.cos(v), sv = Math.sin(v);
  const x = (R + r * cv) * cu;
  const y = (R + r * cv) * su;
  const z = r * sv;
  return { x, y, z };
}

function localFrame(u: number, v: number) {
  // Tangent vectors approx
  const eps = 1e-3;
  const p = torusPoint(u, v);
  const pu = torusPoint(u + eps, v);
  const pv = torusPoint(u, v + eps);
  const tu = normalize(sub(pu, p));
  const tv = normalize(sub(pv, p));
  const n = normalize(cross(tu, tv));
  return { p, tu, tv, n };
}

function add(a: Vec3, b: Vec3): Vec3 { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function scale(a: Vec3, s: number): Vec3 { return { x: a.x * s, y: a.y * s, z: a.z * s }; }
function cross(a: Vec3, b: Vec3): Vec3 { return { x: a.y*b.z - a.z*b.y, y: a.z*b.x - a.x*b.z, z: a.x*b.y - a.y*b.x }; }
function len(a: Vec3) { return Math.hypot(a.x, a.y, a.z); }
function normalize(a: Vec3): Vec3 { const L = len(a) || 1; return { x: a.x/L, y: a.y/L, z: a.z/L }; }

/** Create 14 small triangles arranged evenly around the torus major circle. */
export function baseFaces14(): Tri[] {
  const faces: Tri[] = [];
  for (let i = 0; i < 14; i++) {
    const u = (i / 14) * Math.PI * 2;
    const v = 0; // equator
    const { p, tu, tv } = localFrame(u, v);
    const s = 0.25; // triangle size
    const a = add(p, add(scale(tu, s), scale(tv, 0)));
    const b = add(p, add(scale(tu, -s/2), scale(tv, s * 0.866))); // ~60°
    const c = add(p, add(scale(tu, -s/2), scale(tv, -s * 0.866)));
    faces.push([a, b, c]);
  }
  return faces;
}

/** Barycentric split of a triangle into 4 children (Loop-like face split). */
export function split4(tri: Tri): Tri[] {
  const [a, b, c] = tri;
  const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
  return [
    [a, ab, ca], // 0
    [ab, b, bc], // 1
    [ca, bc, c], // 2
    [ab, bc, ca] // 3 (central)
  ];
}

function mid(a: Vec3, b: Vec3): Vec3 { return scale(add(a, b), 0.5); }

/** Follow address path to get the triangle at a given depth. */
export function triangleAt(addr: ParsedAddress, base: Tri[]): Tri {
  let tri = base[addr.face];
  for (const c of addr.path) tri = split4(tri)[c];
  return tri;
}

export function centroid(tri: Tri): Vec3 {
  const [a, b, c] = tri; return scale(add(add(a, b), c), 1/3);
}
