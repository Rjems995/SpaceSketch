import { expect, it } from "vitest";
import { addRoom, mat, projectSchema, template } from "../lib/model";
import { insertWall } from "../lib/topology";
import { distance } from "../lib/geometry";
it("stores a partial shared room edge only once", () => {
  const p = template("Empty Room");
  addRoom(p, 7, 1, 3, 2);
  const shared = p.walls.filter((w) => w.a.x === 7 && w.b.x === 7);
  expect(shared).toHaveLength(3);
  expect(shared.reduce((sum, w) => sum + distance(w.a, w.b), 0)).toBeCloseTo(5);
  expect(p.rooms[0].points).toContainEqual({ x: 7, z: 1 });
  expect(p.rooms[0].points).toContainEqual({ x: 7, z: 3 });
  expect(projectSchema.safeParse(p).success).toBe(true);
});
it("rebases openings to split segments without moving them", () => {
  const p = template("Empty Room");
  p.openings.push({
    id: crypto.randomUUID(),
    wallId: p.walls[1].id,
    kind: "window",
    offset: 0.8,
    width: 0.8,
    height: 1,
    sill: 1,
  });
  addRoom(p, 7, 0, 3, 2);
  const opening = p.openings.at(-1)!;
  const wall = p.walls.find((w) => w.id === opening.wallId)!;
  expect(wall.a.z + (wall.b.z - wall.a.z) * opening.offset).toBeCloseTo(4);
  expect(projectSchema.safeParse(p).success).toBe(true);
});
it("rejects a new junction that cuts through an existing opening", () => {
  const p = template("Empty Room");
  expect(() =>
    insertWall(p, {
      id: crypto.randomUUID(),
      a: { x: 3.5, z: 0 },
      b: { x: 3.5, z: 2 },
      height: 2.7,
      thickness: 0.15,
      material: mat("#ffffff"),
    }),
  ).toThrow("opening");
});
it("splits intersecting standalone walls into a connected junction", () => {
  const p = template("Empty Room");
  p.rooms = [];
  p.walls = [];
  p.openings = [];
  const wall = {
    id: crypto.randomUUID(),
    a: { x: 0, z: 0 },
    b: { x: 4, z: 0 },
    height: 2.7,
    thickness: 0.15,
    material: mat("#ffffff"),
  };
  insertWall(p, wall);
  insertWall(p, {
    ...wall,
    id: crypto.randomUUID(),
    a: { x: 2, z: -2 },
    b: { x: 2, z: 2 },
  });
  expect(p.walls).toHaveLength(4);
  expect(
    p.walls.every(
      (w) =>
        distance(w.a, { x: 2, z: 0 }) < 0.001 ||
        distance(w.b, { x: 2, z: 0 }) < 0.001,
    ),
  ).toBe(true);
});
