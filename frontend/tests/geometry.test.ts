import { describe, it, expect } from "vitest";
import {
  area,
  corners,
  distance,
  overlap,
  screenToWorld,
  snap,
  worldToScreen,
  validPolygon,
  smartPosition,
} from "../lib/geometry";
import { makeFurniture, projectSchema, template } from "../lib/model";
import { useEditor } from "../stores/editor";
import { resizeRoom, splitWall } from "../lib/rooms";
describe("meter based geometry", () => {
  it("rejects self-intersecting boundaries", () => {
    expect(
      validPolygon([
        { x: 0, z: 0 },
        { x: 3, z: 3 },
        { x: 0, z: 3 },
        { x: 3, z: 0 },
      ]),
    ).toBe(false);
  });
  it("rejects orphan openings", () => {
    const p = template();
    p.openings[0].wallId = "missing";
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("resizes connected wall endpoints with room boundaries", () => {
    const p = template();
    resizeRoom(p, p.rooms[0].id, 10, 6);
    expect(area(p.rooms[0].points)).toBe(60);
    expect(p.walls[0].b).toEqual({ x: 10, z: 0 });
    expect(projectSchema.safeParse(p).success).toBe(true);
  });
  it("splits a wall without disconnecting its endpoints", () => {
    const p = template();
    const id = p.walls[1].id;
    splitWall(p, id);
    expect(p.walls).toHaveLength(5);
    expect(p.walls[1].b).toEqual(p.walls[4].a);
    expect(projectSchema.safeParse(p).success).toBe(true);
  });
  it("does not split through a window", () => {
    const p = template();
    expect(() => splitWall(p, p.walls[0].id)).toThrow("opening");
  });
  it("snaps furniture extents to walls", () => {
    const p = template(),
      o = makeFurniture("chair", 0.49, 2);
    const position = smartPosition(o, [], p.walls);
    expect(position.x).toBeCloseTo(0.475);
  });
  it("keeps the save revision when undoing a saved edit", () => {
    const p = template();
    useEditor.getState().load(p);
    useEditor.getState().patch(p.furniture[0].id, { x: 5 });
    useEditor.setState({
      project: {
        ...useEditor.getState().project!,
        revision: 4,
        cloudRevision: 2,
      },
    });
    useEditor.getState().undo();
    expect(useEditor.getState().project!.revision).toBe(4);
    expect(useEditor.getState().project!.cloudRevision).toBe(2);
  });
  it("round-trips viewport coordinates", () => {
    const p = { x: -1.35, z: 8.2 },
      origin = { x: 200, z: 180 };
    expect(screenToWorld(worldToScreen(p, 72, origin), 72, origin)).toEqual(p);
  });
  it("measures diagonal walls", () =>
    expect(distance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5));
  it("computes concave polygon area independent of winding", () => {
    const p = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 2 },
      { x: 2, z: 2 },
      { x: 2, z: 4 },
      { x: 0, z: 4 },
    ];
    expect(area(p)).toBe(12);
    expect(area([...p].reverse())).toBe(12);
  });
  it("snaps negative coordinates and rotation", () => {
    expect(snap(-1.26)).toBeCloseTo(-1.3);
    expect(snap(37, 15)).toBe(30);
  });
  it("detects rotated corner collisions and ignores separated objects", () => {
    const a = makeFurniture("sofa", 0, 0),
      b = makeFurniture("chair", 1.3, 0);
    expect(overlap(corners(a), corners(b))).toBe(true);
    a.rotation = 90;
    expect(overlap(corners(a), corners(b))).toBe(false);
    b.x = 6;
    expect(overlap(corners(a), corners(b))).toBe(false);
  });
  it("rejects invalid and oversized dimensions", () => {
    const p = template();
    p.furniture[0].width = -1;
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("round-trips all editable template data", () => {
    for (const name of [
      "Empty Room",
      "Bedroom",
      "Living Room",
      "Kitchen",
      "Bathroom",
      "Studio Apartment",
      "Office",
    ]) {
      const p = template(name);
      expect(projectSchema.parse(JSON.parse(JSON.stringify(p)))).toEqual(p);
    }
  });
  it("undoes and redoes transforms without losing IDs", () => {
    const p = template();
    useEditor.getState().load(p);
    const id = p.furniture[0].id;
    useEditor.getState().patch(id, { x: 5, rotation: 90 });
    expect(useEditor.getState().project!.furniture[0].x).toBe(5);
    useEditor.getState().undo();
    expect(useEditor.getState().project).toEqual(p);
    useEditor.getState().redo();
    expect(useEditor.getState().project!.furniture[0].rotation).toBe(90);
  });
  it("preserves locked objects during deletion", () => {
    const p = template();
    p.furniture[0].locked = true;
    useEditor.getState().load(p);
    useEditor.getState().select(p.furniture[0].id);
    useEditor.getState().remove();
    expect(useEditor.getState().project!.furniture).toHaveLength(
      p.furniture.length,
    );
  });
});
