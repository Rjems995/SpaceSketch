import type { Opening, Point, Project, Wall } from "./model";
import { distance, snap, corners } from "./geometry";
export type Guide = { a: Point; b: Point; label: string };
export function alignPoint(
  q: Point,
  targets: Point[],
  step: number,
  threshold = 0.15,
) {
  const result = { x: snap(q.x, step), z: snap(q.z, step) };
  const guides: Guide[] = [];
  for (const axis of ["x", "z"] as const) {
    const target = targets
      .filter((t) => Math.abs(t[axis] - q[axis]) < threshold)
      .sort(
        (a, b) => Math.abs(a[axis] - q[axis]) - Math.abs(b[axis] - q[axis]),
      )[0];
    if (target) {
      result[axis] = target[axis];
      guides.push({
        a: target,
        b: result,
        label: `${axis.toUpperCase()} aligned`,
      });
    }
  }
  return { point: result, guides };
}
export function openingPosition(o: Opening, w: Wall) {
  return {
    x: w.a.x + (w.b.x - w.a.x) * o.offset,
    z: w.a.z + (w.b.z - w.a.z) * o.offset,
  };
}
export function openingOffset(
  p: Project,
  o: Opening,
  q: Point,
  snapping: boolean,
  step: number,
) {
  const w = p.walls.find((w) => w.id === o.wallId)!;
  const len = distance(w.a, w.b);
  let center =
    ((q.x - w.a.x) * (w.b.x - w.a.x) + (q.z - w.a.z) * (w.b.z - w.a.z)) / len;
  if (snapping) {
    const candidates = [
      len / 2,
      ...p.openings
        .filter((other) => other.wallId === w.id && other.id !== o.id)
        .flatMap((other) => [
          other.offset * len - (other.width + o.width) / 2 - 0.1,
          other.offset * len + (other.width + o.width) / 2 + 0.1,
        ]),
    ];
    const target = candidates.sort(
      (a, b) => Math.abs(a - center) - Math.abs(b - center),
    )[0];
    center = Math.abs(target - center) < 0.15 ? target : snap(center, step);
  }
  return Math.max(o.width / 2, Math.min(len - o.width / 2, center)) / len;
}
export function furnitureGuides(
  o: Project["furniture"][number],
  others: Project["furniture"],
  walls: Wall[],
): Guide[] {
  const guides: Guide[] = [];
  const bounds = corners(o);
  for (const other of others.filter((v) => v.id !== o.id && v.kind !== "rug")) {
    for (const axis of ["x", "z"] as const) {
      if (Math.abs(o[axis] - other[axis]) < 0.015)
        guides.push({ a: o, b: other, label: "Centers aligned" });
      const a = corners(o),
        b = corners(other);
      for (const edge of [Math.min, Math.max]) {
        const av = edge(...a.map((p) => p[axis])),
          bv = edge(...b.map((p) => p[axis]));
        if (Math.abs(av - bv) < 0.015)
          guides.push({
            a: { ...o, [axis]: av },
            b: { ...other, [axis]: bv },
            label: "Edges aligned",
          });
      }
    }
    const c = corners(other);
    const left = Math.max(...bounds.map((p) => p.x)),
      right = Math.min(...c.map((p) => p.x));
    if (Math.abs(o.z - other.z) < 0.15 && right > left)
      guides.push({
        a: { x: left, z: o.z },
        b: { x: right, z: o.z },
        label: `${(right - left).toFixed(2)} m gap`,
      });
  }
  for (const wall of walls) {
    const len = distance(wall.a, wall.b);
    const t = Math.max(
      0,
      Math.min(
        1,
        ((o.x - wall.a.x) * (wall.b.x - wall.a.x) +
          (o.z - wall.a.z) * (wall.b.z - wall.a.z)) /
          len ** 2,
      ),
    );
    const q = {
      x: wall.a.x + t * (wall.b.x - wall.a.x),
      z: wall.a.z + t * (wall.b.z - wall.a.z),
    };
    if (distance(o, q) < 2)
      guides.push({
        a: o,
        b: q,
        label: `${distance(o, q).toFixed(2)} m to wall`,
      });
  }
  return guides.slice(0, 6);
}
