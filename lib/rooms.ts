import type { Project, Point } from "./model";
import { distance, pointInPolygon } from "./geometry";
import type { Wall } from "./model";
export function wallBelongsToRoom(w: Wall, points: Point[]) {
  return points.some((a, i) => {
    const b = points[(i + 1) % points.length],
      on = (q: Point) =>
        Math.abs(distance(a, q) + distance(q, b) - distance(a, b)) < 0.001;
    return on(w.a) && on(w.b);
  });
}
export function visibleDesign(p: Project) {
  const walls = p.walls.filter((w) => {
    const owners = p.rooms.filter((r) => wallBelongsToRoom(w, r.points));
    return !owners.length || owners.some((r) => r.visible);
  });
  const furniture = p.furniture.filter((o) => {
    const owners = p.rooms.filter((r) => pointInPolygon(o, r.points));
    return !owners.length || owners.some((r) => r.visible);
  });
  return {
    walls,
    furniture,
    openings: p.openings.filter((o) => walls.some((w) => w.id === o.wallId)),
  };
}
export function deleteRoom(p: Project, id: string) {
  const r = p.rooms.find((r) => r.id === id);
  if (!r) return;
  p.rooms = p.rooms.filter((r) => r.id !== id);
  p.walls = p.walls.filter(
    (w) =>
      !wallBelongsToRoom(w, r.points) ||
      p.rooms.some((r) => wallBelongsToRoom(w, r.points)),
  );
  p.furniture = p.furniture.filter(
    (o) =>
      !pointInPolygon(o, r.points) ||
      p.rooms.some((r) => pointInPolygon(o, r.points)),
  );
  p.openings = p.openings.filter((o) => p.walls.some((w) => w.id === o.wallId));
}
export function resizeRoom(
  p: Project,
  id: string,
  width: number,
  depth: number,
) {
  const r = p.rooms.find((r) => r.id === id);
  if (!r) return;
  const minX = Math.min(...r.points.map((q) => q.x)),
    minZ = Math.min(...r.points.map((q) => q.z)),
    oldW = Math.max(...r.points.map((q) => q.x)) - minX,
    oldD = Math.max(...r.points.map((q) => q.z)) - minZ;
  const changes = r.points.map((q) => ({
    old: { ...q },
    next: {
      x: minX + ((q.x - minX) * width) / oldW,
      z: minZ + ((q.z - minZ) * depth) / oldD,
    },
  }));
  const convert = (q: Point) =>
    changes.find((c) => distance(c.old, q) < 0.001)?.next ?? q;
  p.rooms.forEach((r) => (r.points = r.points.map(convert)));
  p.walls.forEach((w) => {
    w.a = convert(w.a);
    w.b = convert(w.b);
  });
}
export function splitWall(p: Project, id: string) {
  const w = p.walls.find((w) => w.id === id);
  if (!w) return;
  const len = distance(w.a, w.b);
  if (
    p.openings.some(
      (o) => o.wallId === id && Math.abs(o.offset - 0.5) * len < o.width / 2,
    )
  )
    throw new Error(
      "The midpoint crosses an opening. Move or remove the opening first.",
    );
  const oldEnd = { ...w.b },
    mid = { x: (w.a.x + w.b.x) / 2, z: (w.a.z + w.b.z) / 2 },
    newId = crypto.randomUUID();
  w.b = mid;
  // Keep adjoining floor boundaries connected to the new wall endpoint.
  p.rooms.forEach((room) => {
    const points: Point[] = [];
    room.points.forEach((a, i) => {
      const b = room.points[(i + 1) % room.points.length];
      points.push(a);
      if (
        distance(a, mid) > 0.001 &&
        distance(b, mid) > 0.001 &&
        Math.abs(distance(a, mid) + distance(mid, b) - distance(a, b)) < 0.001
      )
        points.push({ ...mid });
    });
    room.points = points;
  });
  p.walls.push({ ...structuredClone(w), id: newId, a: mid, b: oldEnd });
  p.openings
    .filter((o) => o.wallId === id)
    .forEach((o) => {
      if (o.offset > 0.5) {
        o.wallId = newId;
        o.offset = (o.offset - 0.5) * 2;
      } else o.offset *= 2;
    });
}
