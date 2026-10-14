import type { Furniture, Point, Wall } from "./model";
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export const snap = (v: number, step = 0.1) => Math.round(v / step) * step;
export function area(points: Point[]) {
  return (
    Math.abs(
      points.reduce((a, p, i) => {
        const q = points[(i + 1) % points.length];
        return a + p.x * q.z - q.x * p.z;
      }, 0),
    ) / 2
  );
}
export function corners(
  o: Pick<Furniture, "x" | "z" | "width" | "depth" | "rotation">,
): Point[] {
  const r = (o.rotation * Math.PI) / 180;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, z]) => ({
    x:
      o.x +
      ((x * o.width) / 2) * Math.cos(r) -
      ((z * o.depth) / 2) * Math.sin(r),
    z:
      o.z +
      ((x * o.width) / 2) * Math.sin(r) +
      ((z * o.depth) / 2) * Math.cos(r),
  }));
}
export function overlap(a: Point[], b: Point[]) {
  return a.concat(b).every((_, i) => {
    const poly = i < a.length ? a : b,
      j = i < a.length ? i : i - a.length,
      p = poly[j],
      q = poly[(j + 1) % poly.length],
      axis = { x: -(q.z - p.z), z: q.x - p.x };
    const aa = a.map((p) => p.x * axis.x + p.z * axis.z),
      bb = b.map((p) => p.x * axis.x + p.z * axis.z);
    return (
      Math.max(...aa) > Math.min(...bb) + 0.001 &&
      Math.max(...bb) > Math.min(...aa) + 0.001
    );
  });
}
export const format = (n: number, u: string) =>
  `${(n * (u === "cm" ? 100 : u === "ft" ? 3.28084 : u === "in" ? 39.3701 : 1)).toFixed(u === "cm" || u === "in" ? 0 : 2)} ${u}`;
export const worldToScreen = (p: Point, scale: number, origin: Point) => ({
  x: p.x * scale + origin.x,
  z: p.z * scale + origin.z,
});
export const screenToWorld = (p: Point, scale: number, origin: Point) => ({
  x: (p.x - origin.x) / scale,
  z: (p.z - origin.z) / scale,
});

export function validPolygon(points: Point[]) {
  if (points.length < 3 || area(points) < 0.01) return false;
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (distance(a, b) < 0.01) return false;
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      const c = points[j],
        d = points[(j + 1) % points.length];
      if (
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0 &&
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
          Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
        Math.max(Math.min(a.z, b.z), Math.min(c.z, d.z)) <=
          Math.min(Math.max(a.z, b.z), Math.max(c.z, d.z))
      )
        return false;
    }
  }
  return true;
}
export function pointInPolygon(p: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function wallCorners(w: Wall) {
  return corners({
    x: (w.a.x + w.b.x) / 2,
    z: (w.a.z + w.b.z) / 2,
    width: distance(w.a, w.b),
    depth: w.thickness,
    rotation: (Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x) * 180) / Math.PI,
  });
}
export function smartPosition(
  o: Furniture,
  others: Furniture[],
  walls: Wall[],
  step = 0.1,
): Point {
  let x = snap(o.x, step),
    z = snap(o.z, step);
  for (const other of others) {
    if (other.id === o.id || other.kind === "rug") continue;
    if (Math.abs(x - other.x) < 0.12) x = other.x;
    if (Math.abs(z - other.z) < 0.12) z = other.z;
  }
  const cs = corners({ ...o, x, z });
  const halfX = Math.max(...cs.map((c) => Math.abs(c.x - x))),
    halfZ = Math.max(...cs.map((c) => Math.abs(c.z - z)));
  for (const w of walls) {
    if (
      Math.abs(w.a.x - w.b.x) < 0.001 &&
      z >= Math.min(w.a.z, w.b.z) &&
      z <= Math.max(w.a.z, w.b.z)
    ) {
      const edge = w.a.x + Math.sign(x - w.a.x) * (halfX + w.thickness / 2);
      if (Math.abs(x - edge) < 0.15) x = edge;
    }
    if (
      Math.abs(w.a.z - w.b.z) < 0.001 &&
      x >= Math.min(w.a.x, w.b.x) &&
      x <= Math.max(w.a.x, w.b.x)
    ) {
      const edge = w.a.z + Math.sign(z - w.a.z) * (halfZ + w.thickness / 2);
      if (Math.abs(z - edge) < 0.15) z = edge;
    }
  }
  return { x, z };
}
