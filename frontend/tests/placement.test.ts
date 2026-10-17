import { expect, it } from "vitest";
import {
  template,
  projectSchema,
  surfaceKinds,
  surfaceColors,
  makeFurniture,
} from "../lib/model";
import { alignPoint, openingOffset, furnitureGuides } from "../lib/placement";
import { smartPosition } from "../lib/geometry";
import { useEditor } from "../stores/editor";
it("loads older projects without outdoor surfaces or opening styles", () => {
  const old = JSON.parse(JSON.stringify(template()));
  delete old.surfaces;
  const p = projectSchema.parse(old);
  expect(p.surfaces).toEqual([]);
  expect(p.openings[0].style).toBeUndefined();
});
it("persists every outdoor surface and rejects excessive terrain slopes", () => {
  const p = template();
  p.surfaces = surfaceKinds.map((kind, i) => ({
    id: `surface-${i}`,
    kind,
    name: kind,
    x: i * 3,
    z: 8,
    width: 2,
    depth: 2,
    rotation: 15,
    elevation: 0.1,
    slope: kind === "terrain" ? 0.5 : 0,
    color: surfaceColors[kind],
  }));
  expect(projectSchema.parse(JSON.parse(JSON.stringify(p))).surfaces).toEqual(
    p.surfaces,
  );
  p.surfaces[4].slope = 3;
  expect(projectSchema.safeParse(p).success).toBe(false);
});
it("snaps openings to wall center and prevents travel beyond endpoints", () => {
  const p = template(),
    o = p.openings[0];
  expect(openingOffset(p, o, { x: 3.55, z: 0 }, true, 0.1)).toBe(0.5);
  expect(openingOffset(p, o, { x: -10, z: 0 }, false, 0.1)).toBeCloseTo(
    o.width / 14,
  );
});
it("keeps the last valid opening preview and commits one undo step", () => {
  const p = template();
  const s = useEditor.getState();
  s.load(p);
  s.preview((p) => {
    p.openings[0].offset = 0.6;
  });
  s.preview((p) => {
    p.openings[0].width = 4;
    p.openings[0].offset = 0.99;
  });
  expect(useEditor.getState().previewProject!.openings[0].offset).toBe(0.6);
  s.finishPreview(true);
  expect(useEditor.getState().past).toHaveLength(1);
  s.undo();
  expect(useEditor.getState().project!.openings[0].offset).toBe(0.5);
});
it("aligns wall coordinates and furniture edges with visible guides", () => {
  const result = alignPoint({ x: 2.08, z: 4.04 }, [{ x: 2, z: 1 }], 0.1);
  expect(result.point.x).toBe(2);
  expect(result.guides[0].label).toBe("X aligned");
  const a = makeFurniture("chair", 2, 2),
    b = makeFurniture("chair", 2.06, 4);
  const pos = smartPosition(b, [a], [], 0.1);
  expect(pos.x).toBe(2);
  expect(
    furnitureGuides({ ...b, ...pos }, [a], []).some((g) =>
      g.label.includes("aligned"),
    ),
  ).toBe(true);
});
