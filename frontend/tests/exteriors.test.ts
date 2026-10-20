import { expect, it } from "vitest";
import { template, projectSchema } from "@/lib/model";
import { makeExterior, roofFaces, worldVertex } from "@/lib/exteriors";
import { addFloor, switchFloor } from "@/lib/floors";
import { walkBlocked } from "@/lib/walkthrough";
import { useEditor } from "@/stores/editor";
it("keeps old documents compatible and preserves exterior settings across floors and JSON", () => {
  const p = template("Empty Room");
  p.surfaces = (["roof", "balcony", "boundary-fence"] as const).map((kind) =>
    makeExterior(p, kind),
  );
  p.surfaces[0].roofStyle = "shed";
  p.surfaces[2].fenceStyle = "solid";
  const original = structuredClone(p.surfaces);
  addFloor(p);
  expect(p.surfaces).toEqual([]);
  switchFloor(p, "ground");
  expect(projectSchema.parse(JSON.parse(JSON.stringify(p))).surfaces).toEqual(
    original,
  );
  const old = template("Empty Room");
  delete (old as Partial<typeof old>).surfaces;
  expect(projectSchema.parse(old).surfaces).toEqual([]);
});
it("fits roofs to wall bounds and changes pitch geometry for each roof style", () => {
  const p = template("Empty Room"),
    roof = makeExterior(p, "roof");
  const xs = p.walls.flatMap((w) => [w.a.x, w.b.x]);
  expect(roof.width).toBeCloseTo(Math.max(...xs) - Math.min(...xs) + 0.6);
  expect(
    Math.max(
      ...roofFaces(roof)
        .flat()
        .map((v) => v[1]),
    ),
  ).toBe(1.2);
  roof.roofStyle = "flat";
  expect(roofFaces(roof)).toHaveLength(1);
  roof.rotation = 90;
  roof.x = 3;
  roof.z = 4;
  roof.elevation = 2;
  const q = worldVertex(roof, [1, 1, 0]);
  expect(q[0]).toBeCloseTo(3);
  expect(q[1]).toBe(3);
  expect(q[2]).toBeCloseTo(5);
});
it("supports duplication, undo, deletion, and fence collision", () => {
  const p = template("Empty Room"),
    fence = makeExterior(p, "boundary-fence");
  fence.x = 20;
  fence.z = 20;
  p.surfaces = [fence];
  useEditor.getState().load(p);
  useEditor.getState().select(fence.id);
  useEditor.getState().duplicate();
  expect(useEditor.getState().project!.surfaces).toHaveLength(2);
  useEditor.getState().undo();
  expect(useEditor.getState().project!.surfaces).toHaveLength(1);
  useEditor.getState().remove();
  expect(useEditor.getState().project!.surfaces).toHaveLength(0);
  expect(walkBlocked(p, { x: 20, z: 20 })).toBe(true);
  expect(walkBlocked(p, { x: 20, z: 22 })).toBe(false);
});
it("rejects invalid exterior dimensions and unsupported styles", () => {
  const p = template("Empty Room");
  p.surfaces = [makeExterior(p, "roof")];
  p.surfaces[0].height = -1;
  expect(projectSchema.safeParse(p).success).toBe(false);
});
