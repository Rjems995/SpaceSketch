import type { Project, Point } from "./model";
import { mat } from "./model";
import { distance, validPolygon } from "./geometry";
import { insertWall } from "./topology";

export function curvePoints(
  a: Point,
  control: Point,
  b: Point,
  segments = 16,
): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments,
      u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
      z: u * u * a.z + 2 * u * t * control.z + t * t * b.z,
    };
  });
}
export function addCurvedWall(p: Project, a: Point, control: Point, b: Point) {
  const points = curvePoints(a, control, b);
  const curveId = crypto.randomUUID();
  if (points.some((q, i) => i && distance(points[i - 1], q) < 0.05))
    throw new Error("Draw a larger curve; each segment needs at least 5 cm");
  points.slice(1).forEach((q, i) =>
    insertWall(p, {
      id: crypto.randomUUID(),
      curveId,
      a: points[i],
      b: q,
      height: 2.7,
      thickness: 0.15,
      material: mat("#e9e5da"),
    }),
  );
}
export function curveWall(p: Project, id: string, bend: number) {
  const wall = p.walls.find((w) => w.id === id);
  if (!wall) return;
  if (p.openings.some((o) => o.wallId === id))
    throw new Error("Move or remove openings before curving this wall");
  const length = distance(wall.a, wall.b);
  const control = {
    x: (wall.a.x + wall.b.x) / 2 - ((wall.b.z - wall.a.z) / length) * bend * 2,
    z: (wall.a.z + wall.b.z) / 2 + ((wall.b.x - wall.a.x) / length) * bend * 2,
  };
  const points = curvePoints(wall.a, control, wall.b);
  const curveId = crypto.randomUUID();
  for (const room of p.rooms) {
    const boundary: Point[] = [];
    room.points.forEach((a, i) => {
      const b = room.points[(i + 1) % room.points.length];
      boundary.push(a);
      if (distance(a, wall.a) < 0.001 && distance(b, wall.b) < 0.001)
        boundary.push(...points.slice(1, -1));
      else if (distance(a, wall.b) < 0.001 && distance(b, wall.a) < 0.001)
        boundary.push(...points.slice(1, -1).reverse());
    });
    if (!validPolygon(boundary))
      throw new Error("This curve would cross the room boundary");
    room.points = boundary;
  }
  p.walls = p.walls.filter((w) => w.id !== id);
  points.slice(1).forEach((q, i) =>
    p.walls.push({
      ...structuredClone(wall),
      curveId,
      id: i ? crypto.randomUUID() : wall.id,
      a: points[i],
      b: q,
    }),
  );
}
