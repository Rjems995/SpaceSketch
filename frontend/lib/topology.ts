import type { Point, Project, Wall } from "./model";
import { distance } from "./geometry";
const EPS = 0.00001;
const lerp = (a: Point, b: Point, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
});
const fraction = (p: Point, w: Wall) =>
  ((p.x - w.a.x) * (w.b.x - w.a.x) + (p.z - w.a.z) * (w.b.z - w.a.z)) /
  distance(w.a, w.b) ** 2;
const on = (p: Point, w: Wall) =>
  Math.abs(distance(w.a, p) + distance(p, w.b) - distance(w.a, w.b)) < EPS;
function insertFloorVertex(p: Project, q: Point) {
  for (const room of p.rooms) {
    const points: Point[] = [];
    room.points.forEach((a, i) => {
      const b = room.points[(i + 1) % room.points.length];
      points.push(a);
      if (
        distance(a, q) > EPS &&
        distance(b, q) > EPS &&
        Math.abs(distance(a, q) + distance(q, b) - distance(a, b)) < EPS
      )
        points.push({ ...q });
    });
    room.points = points;
  }
}
/** Split a wall while retaining its first ID and rebasing attached openings. */
function splitAt(p: Project, wall: Wall, values: number[]) {
  const cuts = [0, ...values.filter((t) => t > EPS && t < 1 - EPS), 1]
    .sort((a, b) => a - b)
    .filter((t, i, a) => i === 0 || t - a[i - 1] > EPS);
  if (cuts.length === 2) return;
  const length = distance(wall.a, wall.b);
  const openings = p.openings.filter((o) => o.wallId === wall.id);
  if (
    openings.some((o) =>
      cuts.some((t) => Math.abs(t - o.offset) * length < o.width / 2 - EPS),
    )
  )
    throw new Error(
      "A room boundary would split an existing opening. Move the opening before connecting these rooms.",
    );
  const pieces = cuts.slice(1).map((t, i) => ({
    ...structuredClone(wall),
    id: i === 0 ? wall.id : crypto.randomUUID(),
    a: lerp(wall.a, wall.b, cuts[i]),
    b: lerp(wall.a, wall.b, t),
  }));
  const index = p.walls.findIndex((w) => w.id === wall.id);
  p.walls.splice(index, 1, ...pieces);
  for (const opening of openings) {
    const i = cuts.findIndex(
      (t, i) =>
        i < cuts.length - 1 &&
        opening.offset >= t - EPS &&
        opening.offset <= cuts[i + 1] + EPS,
    );
    opening.wallId = pieces[i].id;
    opening.offset = (opening.offset - cuts[i]) / (cuts[i + 1] - cuts[i]);
  }
  cuts
    .slice(1, -1)
    .forEach((t) => insertFloorVertex(p, lerp(wall.a, wall.b, t)));
}
/** Normalize shared collinear boundaries and T/cross junctions into single edges. */
export function insertWall(p: Project, wall: Wall) {
  if (distance(wall.a, wall.b) < 0.05)
    throw new Error("Walls must be at least 5 cm long.");
  const newCuts = [0, 1];
  for (const existing of [...p.walls]) {
    const cuts: number[] = [];
    for (const q of [wall.a, wall.b])
      if (on(q, existing)) cuts.push(fraction(q, existing));
    for (const q of [existing.a, existing.b])
      if (on(q, wall)) newCuts.push(fraction(q, wall));
    const rx = wall.b.x - wall.a.x,
      rz = wall.b.z - wall.a.z,
      sx = existing.b.x - existing.a.x,
      sz = existing.b.z - existing.a.z,
      den = rx * sz - rz * sx;
    if (Math.abs(den) > EPS) {
      const qx = existing.a.x - wall.a.x,
        qz = existing.a.z - wall.a.z,
        t = (qx * sz - qz * sx) / den,
        u = (qx * rz - qz * rx) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        newCuts.push(t);
        cuts.push(u);
      }
    }
    splitAt(p, existing, cuts);
  }
  const cuts = newCuts
    .filter((t) => t >= -EPS && t <= 1 + EPS)
    .map((t) => Math.max(0, Math.min(1, t)))
    .sort((a, b) => a - b)
    .filter((t, i, a) => i === 0 || t - a[i - 1] > EPS);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = lerp(wall.a, wall.b, cuts[i]),
      b = lerp(wall.a, wall.b, cuts[i + 1]);
    if (p.walls.some((w) => on(a, w) && on(b, w))) continue;
    p.walls.push({
      ...structuredClone(wall),
      id: i === 0 ? wall.id : crypto.randomUUID(),
      a,
      b,
    });
    insertFloorVertex(p, a);
    insertFloorVertex(p, b);
  }
}
