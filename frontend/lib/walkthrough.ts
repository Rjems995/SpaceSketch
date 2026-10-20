import type { Point, Project } from "./model";
import { corners, overlap, pointInPolygon } from "./geometry";
export function walkBlocked(p: Project, position: Point) {
  const player = corners({
    ...position,
    width: 0.36,
    depth: 0.36,
    rotation: 0,
  });
  if (
    p.furniture
      .filter((f) => !["rug", "painting"].includes(f.kind))
      .some((f) => overlap(player, corners(f)))
  )
    return true;
  if (
    p.surfaces.some(
      (o) =>
        o.kind === "boundary-fence" &&
        o.elevation <= p.camera.eyeHeight &&
        o.elevation + (o.height ?? 1.5) > 0 &&
        overlap(player, corners(o)),
    )
  )
    return true;
  return p.walls.some((w) => {
    const dx = w.b.x - w.a.x,
      dz = w.b.z - w.a.z,
      length = Math.hypot(dx, dz);
    if (!length) return false;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((position.x - w.a.x) * dx + (position.z - w.a.z) * dz) /
          (length * length),
      ),
    );
    return (
      Math.hypot(position.x - w.a.x - t * dx, position.z - w.a.z - t * dz) <
        0.18 + w.thickness / 2 &&
      !p.openings.some(
        (o) =>
          o.wallId === w.id &&
          o.kind === "door" &&
          o.height >= p.camera.eyeHeight + 0.1 &&
          Math.abs(t - o.offset) * length < o.width / 2 - 0.18,
      )
    );
  });
}
export function walkStart(p: Project): Point {
  for (const room of p.rooms) {
    const center = {
      x: room.points.reduce((v, q) => v + q.x, 0) / room.points.length,
      z: room.points.reduce((v, q) => v + q.z, 0) / room.points.length,
    };
    const minX = Math.min(...room.points.map((q) => q.x)),
      maxX = Math.max(...room.points.map((q) => q.x));
    const minZ = Math.min(...room.points.map((q) => q.z)),
      maxZ = Math.max(...room.points.map((q) => q.z));
    const candidates = [center];
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++)
        candidates.push({
          x: minX + ((x + 0.5) * (maxX - minX)) / 16,
          z: minZ + ((z + 0.5) * (maxZ - minZ)) / 16,
        });
    const free = candidates.find(
      (q) => pointInPolygon(q, room.points) && !walkBlocked(p, q),
    );
    if (free) return free;
  }
  const points = [
    ...p.walls.flatMap((w) => [w.a, w.b]),
    ...p.furniture.flatMap(corners),
  ];
  return {
    x: Math.min(0, ...points.map((q) => q.x)) - 1,
    z: Math.min(0, ...points.map((q) => q.z)) - 1,
  };
}
export function walkMove(p: Project, from: Point, delta: Point): Point {
  const next = { ...from },
    steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / 0.08));
  for (let i = 0; i < steps; i++) {
    const x = { x: next.x + delta.x / steps, z: next.z };
    if (!walkBlocked(p, x)) next.x = x.x;
    const z = { x: next.x, z: next.z + delta.z / steps };
    if (!walkBlocked(p, z)) next.z = z.z;
  }
  return next;
}
