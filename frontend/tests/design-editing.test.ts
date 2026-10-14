import { expect, it } from "vitest";
import { catalog, kinds, makeFurniture, projectSchema, template } from "../lib/model";
import { moveWallEndpoint } from "../lib/rooms";
import { useEditor } from "../stores/editor";

it("round trips every catalog piece through a saved project", () => {
  const p = template("Empty Room");
  p.furniture = catalog.map(c => makeFurniture(c.kind));
  expect(new Set(catalog.map(c => c.kind)).size).toBe(kinds.length);
  expect(projectSchema.parse(JSON.parse(JSON.stringify(p))).furniture).toEqual(p.furniture);
});

it("moves connected wall endpoints and room corners, and supports undo", () => {
  const p = template("Empty Room");
  const wall = p.walls[0];
  const old = { ...wall.b };
  const next = { x: old.x + 1, z: old.z };
  useEditor.getState().load(p);
  useEditor.getState().edit(p => moveWallEndpoint(p, wall.id, "b", next));
  const changed = useEditor.getState().project!;
  expect(changed.walls[0].b).toEqual(next);
  expect(changed.walls.some(w => w.id !== wall.id && JSON.stringify(w.a) === JSON.stringify(next))).toBe(true);
  expect(changed.rooms[0].points).toContainEqual(next);
  useEditor.getState().undo();
  expect(useEditor.getState().project!.walls[0].b).toEqual(old);
});

it("rejects overlapping windows and wall edits that no longer fit a window", () => {
  const p = template("Empty Room");
  p.openings = [{ id: "window1", wallId: p.walls[0].id, kind: "window", offset: 0.5, width: 1.2, height: 1.3, sill: 0.9 }];
  expect(projectSchema.safeParse(p).success).toBe(true);
  useEditor.getState().load(p);
  useEditor.getState().edit(p => { p.walls[0].height = 1.5; });
  expect(useEditor.getState().project!.walls[0].height).toBe(2.7);
  p.openings.push({ ...p.openings[0], id: "window2", offset: 0.52 });
  expect(projectSchema.safeParse(p).success).toBe(false);
});
it("previews wall resizing without saving intermediate states and commits one undo step", () => {
  const p = template("Empty Room");
  const s = useEditor.getState();
  s.load(p);
  s.preview(p => { p.walls[0].height = 3; });
  s.preview(p => { p.walls[0].height = 3.5; });
  expect(useEditor.getState().project!.walls[0].height).toBe(2.7);
  expect(useEditor.getState().previewProject!.walls[0].height).toBe(3.5);
  expect(useEditor.getState().past).toHaveLength(0);
  s.finishPreview(true);
  expect(useEditor.getState().project!.walls[0].height).toBe(3.5);
  expect(useEditor.getState().past).toHaveLength(1);
  s.undo();
  expect(useEditor.getState().project!.walls[0].height).toBe(2.7);
  s.preview(p => { p.walls[0].height = 4; });
  s.finishPreview(false);
  expect(useEditor.getState().project!.walls[0].height).toBe(2.7);
  expect(useEditor.getState().previewProject).toBeNull();
});
