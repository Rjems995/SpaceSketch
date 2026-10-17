import { describe, expect, it } from "vitest";
import { makeFurniture, projectSchema, template } from "@/lib/model";
import { placementChecks } from "@/lib/placement-checks";
import { materialPresets } from "@/lib/material-presets";

describe("placement warnings", () => {
  it("detects rotated overlapping footprints but allows edge contact and rugs", () => {
    const p = template("Empty Room");
    p.openings = [];
    const a = makeFurniture("table", 3, 3);
    a.width = a.depth = 1;
    const b = { ...a, id: crypto.randomUUID(), x: 4 };
    p.furniture = [a, b, makeFurniture("rug", 3, 3)];
    expect(placementChecks(p)).toHaveLength(0);
    b.rotation = 45;
    expect(placementChecks(p)).toHaveLength(1);
    b.x = 6;
    expect(placementChecks(p)).toHaveLength(0);
  });
  it("checks both sides of angled doors and ignores windows", () => {
    const p = template("Empty Room");
    p.walls = [{ ...p.walls[0], a: { x: 0, z: 0 }, b: { x: 4, z: 4 } }];
    p.openings = [
      {
        id: "door",
        wallId: p.walls[0].id,
        kind: "door",
        offset: 0.5,
        width: 1,
        height: 2,
        sill: 0,
      },
    ];
    for (const offset of [-0.4, 0.4]) {
      p.furniture = [
        {
          ...makeFurniture("chair", 2 + offset, 2 - offset),
          width: 0.3,
          depth: 0.3,
        },
      ];
      expect(placementChecks(p)[0].ids).toContain("door");
    }
    p.openings[0].kind = "window";
    expect(placementChecks(p)).toHaveLength(0);
  });
});

it.each(["Bedroom", "Kitchen", "Office", "Outdoor Patio"])(
  "provides a valid furnished %s template without placement warnings",
  (name) => {
    const p = template(name);
    expect(projectSchema.safeParse(p).success).toBe(true);
    expect(p.furniture.length).toBeGreaterThan(0);
    expect(placementChecks(p)).toEqual([]);
    expect(template(name).id).not.toBe(p.id);
  },
);

it("round-trips every finish through the project schema", () => {
  const p = template();
  for (const preset of materialPresets) {
    p.furniture[0].material = { ...preset.material };
    expect(
      projectSchema.parse(JSON.parse(JSON.stringify(p))).furniture[0].material,
    ).toEqual(preset.material);
  }
});
