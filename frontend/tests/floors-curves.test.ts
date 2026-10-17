import { expect, it } from "vitest";
import { projectSchema, template, addRoom, makeFurniture } from "@/lib/model";
import {
  addFloor,
  switchFloor,
  floorList,
  deleteActiveFloor,
} from "@/lib/floors";
import { addCurvedWall, curveWall, curvePoints } from "@/lib/curves";
import { moveRoomCorner } from "@/lib/rooms";
import { useEditor } from "@/stores/editor";

it("preserves independent floor geometry through switching and JSON round trips", () => {
  const p = template("Bedroom");
  const original = structuredClone(p.rooms);
  addFloor(p);
  const upper = p.activeFloor!.id;
  expect(p.rooms).toHaveLength(0);
  addRoom(p, 0, 0, 4, 3);
  p.furniture.push(makeFurniture("stairs", 2, 2));
  const parsed = projectSchema.parse(JSON.parse(JSON.stringify(p)));
  switchFloor(parsed, "ground");
  expect(parsed.rooms).toEqual(original);
  expect(parsed.furniture.some((o) => o.kind === "stairs")).toBe(false);
  switchFloor(parsed, upper);
  expect(parsed.rooms[0].points[1].x).toBe(4);
  expect(parsed.furniture[0].kind).toBe("stairs");
  expect(floorList(parsed)).toHaveLength(2);
});
it("supports floor creation and deletion undo without mixing layouts", () => {
  useEditor.getState().load(template());
  useEditor.getState().edit(addFloor);
  useEditor.getState().edit(deleteActiveFloor);
  expect(floorList(useEditor.getState().project!)).toHaveLength(1);
  useEditor.getState().undo();
  expect(floorList(useEditor.getState().project!)).toHaveLength(2);
  useEditor.getState().undo();
  expect(useEditor.getState().project!.furniture.length).toBeGreaterThan(0);
  expect(floorList(useEditor.getState().project!)).toHaveLength(1);
});
it("validates stored floor geometry and rejects duplicate floor IDs", () => {
  const p = template();
  addFloor(p);
  p.floors![0].plan.walls[0].b = { ...p.floors![0].plan.walls[0].a };
  expect(projectSchema.safeParse(p).success).toBe(false);
  const q = template();
  addFloor(q);
  q.activeFloor!.id = "ground";
  expect(projectSchema.safeParse(q).success).toBe(false);
});
it("draws a continuous curved wall and preserves exact endpoints", () => {
  const p = template();
  p.walls = [];
  p.rooms = [];
  p.openings = [];
  const a = { x: 0, z: 0 },
    c = { x: 3, z: 3 },
    b = { x: 6, z: 0 };
  addCurvedWall(p, a, c, b);
  expect(p.walls).toHaveLength(16);
  expect(p.walls[0].a).toEqual(a);
  expect(p.walls.at(-1)!.b).toEqual(b);
  expect(curvePoints(a, c, b)[8]).toEqual({ x: 3, z: 1.5 });
  expect(projectSchema.safeParse(p).success).toBe(true);
});
it("curves a room boundary and keeps its floor attached", () => {
  const p = template("Empty Room");
  p.openings = [];
  curveWall(p, p.walls[0].id, -1);
  expect(p.rooms[0].points).toHaveLength(19);
  expect(p.walls).toHaveLength(19);
  expect(projectSchema.safeParse(p).success).toBe(true);
});
it("rejects curving a wall with openings and invalid room corner moves", () => {
  const p = template("Empty Room");
  expect(() => curveWall(p, p.walls[0].id, 1)).toThrow(/openings/);
  p.openings = [];
  useEditor.getState().load(p);
  useEditor
    .getState()
    .edit((p) => moveRoomCorner(p, p.rooms[0].id, 1, { x: -1, z: 3 }));
  expect(useEditor.getState().project!.rooms[0].points).toEqual(
    p.rooms[0].points,
  );
});
it("moves shared corners with a single undo step", () => {
  const p = template("Empty Room");
  p.openings = [];
  addRoom(p, 7, 0, 4, 5);
  useEditor.getState().load(p);
  const s = useEditor.getState();
  s.preview((p) => moveRoomCorner(p, p.rooms[0].id, 1, { x: 8, z: 0 }));
  s.finishPreview(true);
  const current = useEditor.getState().project!;
  expect(current.rooms[1].points).toContainEqual({ x: 8, z: 0 });
  expect(useEditor.getState().past).toHaveLength(1);
  s.undo();
  expect(useEditor.getState().project!.rooms[0].points[1]).toEqual({
    x: 7,
    z: 0,
  });
});
