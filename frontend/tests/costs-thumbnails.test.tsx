import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { template, makeFurniture, addRoom } from "@/lib/model";
import { addFloor } from "@/lib/floors";
import { costBreakdown, shoppingListCsv } from "@/lib/costs";
import ProjectThumbnail from "@/components/project-thumbnail";

it("counts each item once, groups variants, and totals all floors in cents", () => {
  const p = template("Empty Room");
  const chair = makeFurniture("chair", 2, 2);
  chair.price = 12.35;
  p.furniture = [
    chair,
    { ...structuredClone(chair), id: crypto.randomUUID(), x: 2.5 },
    { ...makeFurniture("table", 20, 20), price: 10.1 },
  ];
  addFloor(p);
  addRoom(p, 0, 0, 5, 5);
  p.furniture = [{ ...makeFurniture("lamp", 1, 1), price: 4.2 }];
  const groups = costBreakdown(p);
  expect(groups).toHaveLength(3);
  expect(
    groups.find((g) => g.roomId !== "unassigned" && g.floorId === "ground")!
      .items[0].quantity,
  ).toBe(2);
  expect(groups.reduce((n, g) => n + g.totalCents, 0)).toBe(3900);
});
it("assigns overlapping rooms to the smallest containing room without double counting", () => {
  const p = template("Empty Room");
  p.rooms.push({
    ...structuredClone(p.rooms[0]),
    id: "small",
    name: "Small",
    points: [
      { x: 1, z: 1 },
      { x: 3, z: 1 },
      { x: 3, z: 3 },
      { x: 1, z: 3 },
    ],
  });
  p.furniture = [{ ...makeFurniture("chair", 2, 2), price: 25 }];
  const groups = costBreakdown(p);
  expect(groups).toHaveLength(1);
  expect(groups[0].roomId).toBe("small");
  expect(groups[0].totalCents).toBe(2500);
});
it("exports quoted shopping rows and neutralizes spreadsheet formulas", () => {
  const p = template("Empty Room");
  p.furniture = [
    { ...makeFurniture("chair", 2, 2), name: '=SUM(1,2) "chair"', price: 12.5 },
  ];
  const csv = shoppingListCsv(p);
  expect(csv).toContain('"\'=SUM(1,2) ""chair"""');
  expect(csv).toContain('"12.50"');
  expect(csv).toContain('"TOTAL"');
  p.furniture = [];
  expect(shoppingListCsv(p)).toContain('"0.00"');
});
it("renders saved geometry and fits distant outdoor objects in the thumbnail", () => {
  const p = template("Outdoor Patio");
  p.furniture.push(makeFurniture("tree", 60, 50));
  const markup = renderToStaticMarkup(<ProjectThumbnail project={p} />);
  expect(markup).toContain("design preview");
  expect(markup).toContain("polygon");
  const viewBox = markup
    .match(/viewBox="([^"]+)"/)![1]
    .split(" ")
    .map(Number);
  expect(viewBox[3]).toBeGreaterThan(50);
  p.walls = [];
  p.rooms = [];
  p.furniture = [];
  p.surfaces = [];
  expect(renderToStaticMarkup(<ProjectThumbnail project={p} />)).toContain(
    "Empty floor",
  );
});
