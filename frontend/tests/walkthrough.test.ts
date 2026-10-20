import { expect, it } from "vitest";
import { template, makeFurniture } from "@/lib/model";
import { walkBlocked, walkStart, walkMove } from "@/lib/walkthrough";
import { pointInPolygon } from "@/lib/geometry";
it("starts inside an off-origin room without spawning in furniture", () => {
  const p = template("Empty Room");
  for (const r of p.rooms)
    for (const q of r.points) {
      q.x += 30;
      q.z += 20;
    }
  for (const w of p.walls) {
    w.a.x += 30;
    w.a.z += 20;
    w.b.x += 30;
    w.b.z += 20;
  }
  const center = {
    x: p.rooms[0].points.reduce((s, q) => s + q.x, 0) / 4,
    z: p.rooms[0].points.reduce((s, q) => s + q.z, 0) / 4,
  };
  p.furniture = [makeFurniture("sofa", center.x, center.z)];
  const start = walkStart(p);
  expect(pointInPolygon(start, p.rooms[0].points)).toBe(true);
  expect(walkBlocked(p, start)).toBe(false);
});
it("blocks walls, passes through doors, and never treats a window as a door", () => {
  const p = template("Empty Room");
  p.furniture = [];
  const wall = p.walls[0];
  wall.a = { x: 0, z: 0 };
  wall.b = { x: 6, z: 0 };
  p.walls = [wall];
  p.openings = [];
  expect(walkBlocked(p, { x: 3, z: 0 })).toBe(true);
  const opening = template("Empty Room").openings.find(
    (o) => o.kind === "door",
  )!;
  p.openings = [
    { ...opening, wallId: wall.id, offset: 0.5, width: 1, height: 2.2 },
  ];
  expect(walkBlocked(p, { x: 3, z: 0 })).toBe(false);
  p.openings[0].kind = "window";
  expect(walkBlocked(p, { x: 3, z: 0 })).toBe(true);
});
it("prevents tunneling and slides along a wall", () => {
  const p = template("Empty Room");
  p.furniture = [];
  p.openings = [];
  p.walls = [{ ...p.walls[0], a: { x: 0, z: -10 }, b: { x: 0, z: 10 } }];
  const next = walkMove(p, { x: 1, z: 1 }, { x: -2, z: 1 });
  expect(next.x).toBeGreaterThan(0);
  expect(next.z).toBeCloseTo(2);
});
