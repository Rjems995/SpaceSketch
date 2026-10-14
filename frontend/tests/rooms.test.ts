import { expect, it } from "vitest";
import { addPolygonRoom, addRoom, projectSchema, template } from "../lib/model";
import { deleteRoom, visibleDesign } from "../lib/rooms";
import { area } from "../lib/geometry";
import { validateGltfDocument } from "../lib/import-model";
it("creates a custom room with the same polygon driving walls and floor", () => {
  const p = template("Empty Room");
  addPolygonRoom(p, [
    { x: 8, z: 0 },
    { x: 11, z: 0 },
    { x: 11, z: 2 },
    { x: 9, z: 2 },
    { x: 9, z: 4 },
    { x: 8, z: 4 },
  ]);
  expect(p.walls).toHaveLength(10);
  expect(area(p.rooms[1].points)).toBe(8);
  expect(projectSchema.safeParse(p).success).toBe(true);
});
it("hides room contents while retaining walls shared with a visible room", () => {
  const p = template();
  addRoom(p, 7, 0, 3, 5);
  p.rooms[0].visible = false;
  const shown = visibleDesign(p);
  expect(shown.walls).toHaveLength(4);
  expect(shown.furniture).toHaveLength(0);
  expect(p.furniture).toHaveLength(6);
});
it("deletes only unshared room walls and its contents", () => {
  const p = template();
  addRoom(p, 7, 0, 3, 5);
  deleteRoom(p, p.rooms[0].id);
  expect(p.rooms).toHaveLength(1);
  expect(p.walls).toHaveLength(4);
  expect(p.furniture).toHaveLength(0);
  expect(projectSchema.safeParse(p).success).toBe(true);
});
it("rejects model dependencies that could make external network requests", () => {
  expect(() =>
    validateGltfDocument({
      buffers: [{ uri: "https://example.com/model.bin" }],
    }),
  ).toThrow("External URLs");
  expect(() =>
    validateGltfDocument({ images: [{ uri: "file:///tmp/image.png" }] }),
  ).toThrow();
  expect(() =>
    validateGltfDocument({
      buffers: [{ uri: "data:application/octet-stream;base64,AAAA" }],
    }),
  ).not.toThrow();
});
