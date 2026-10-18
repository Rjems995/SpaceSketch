import { expect, it } from "vitest";
import { parseFavorites, searchCatalog } from "@/lib/catalog-search";
import { defaultLight, lightColor } from "@/lib/lighting";
import { makeFurniture, projectSchema, template } from "@/lib/model";
import { addFloor, switchFloor } from "@/lib/floors";
import { useEditor } from "@/stores/editor";

it("handles damaged favorites and searches multiple terms across categories", () => {
  expect(parseFavorites("bad JSON")).toEqual([]);
  expect(parseFavorites('["lamp","unknown","lamp",7]')).toEqual(["lamp"]);
  expect(
    searchCatalog("  FLOOR lighting ", "All", [], false).map((c) => c.kind),
  ).toEqual(["lamp"]);
  expect(searchCatalog("", "All", ["lamp"], true).map((c) => c.kind)).toEqual([
    "lamp",
  ]);
  expect(searchCatalog("", "Outdoor", ["lamp"], true)).toEqual([]);
});
it("preserves independent lamp settings, undo, and floor round trips", () => {
  const p = template("Empty Room");
  p.furniture = [makeFurniture("lamp"), makeFurniture("lamp")];
  const id = p.furniture[0].id;
  useEditor.getState().load(p);
  useEditor.getState().patch(id, {
    light: { ...defaultLight, brightness: 150, temperature: 5000 },
  });
  expect(useEditor.getState().project!.furniture[1].light).toBeUndefined();
  useEditor.getState().undo();
  expect(useEditor.getState().project!.furniture[0].light).toBeUndefined();
  useEditor.getState().redo();
  const next = structuredClone(useEditor.getState().project!);
  addFloor(next);
  const parsed = projectSchema.parse(JSON.parse(JSON.stringify(next)));
  switchFloor(parsed, "ground");
  expect(parsed.furniture[0].light).toEqual({
    enabled: true,
    brightness: 150,
    temperature: 5000,
  });
  parsed.furniture[0].light!.temperature = 100000;
  expect(projectSchema.safeParse(parsed).success).toBe(false);
});
it("produces distinct warm and cool light colors, with bounded temperatures", () => {
  expect(lightColor(3000)).toBe("#ffdaa2");
  expect(lightColor(1800)).not.toBe(lightColor(6500));
  expect(lightColor(0)).toBe(lightColor(1800));
  expect(lightColor(10000)).toBe(lightColor(6500));
});
