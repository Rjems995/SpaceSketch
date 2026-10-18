import type { Furniture, Project } from "./model";
import { area, pointInPolygon } from "./geometry";
import { groundFloor } from "./floors";
export type CostItem = {
  furniture: Furniture;
  quantity: number;
  unitCents: number;
  totalCents: number;
};
export type CostGroup = {
  floorId: string;
  floor: string;
  roomId: string;
  room: string;
  items: CostItem[];
  totalCents: number;
};
export function costBreakdown(p: Project): CostGroup[] {
  const floors = [
    { info: p.activeFloor ?? groundFloor, plan: p },
    ...(p.floors ?? []),
  ].sort((a, b) => a.info.elevation - b.info.elevation);
  return floors.flatMap(({ info, plan }) => {
    const groups = new Map<string, CostGroup>();
    const rooms = [...plan.rooms].sort(
      (a, b) => area(a.points) - area(b.points),
    );
    for (const furniture of plan.furniture) {
      const room = rooms.find((r) => pointInPolygon(furniture, r.points));
      const id = room?.id ?? "unassigned";
      const group = groups.get(id) ?? {
        floorId: info.id,
        floor: info.name,
        roomId: id,
        room: room?.name ?? "Outdoor / unassigned",
        items: [],
        totalCents: 0,
      };
      const unitCents = Math.round(furniture.price * 100);
      const same = group.items.find(
        (i) =>
          i.unitCents === unitCents &&
          i.furniture.kind === furniture.kind &&
          i.furniture.name === furniture.name &&
          i.furniture.width === furniture.width &&
          i.furniture.depth === furniture.depth &&
          i.furniture.height === furniture.height &&
          JSON.stringify(i.furniture.material) ===
            JSON.stringify(furniture.material) &&
          JSON.stringify(i.furniture.model) === JSON.stringify(furniture.model),
      );
      if (same) {
        same.quantity++;
        same.totalCents += unitCents;
      } else
        group.items.push({
          furniture,
          quantity: 1,
          unitCents,
          totalCents: unitCents,
        });
      group.totalCents += unitCents;
      groups.set(id, group);
    }
    return [...groups.values()];
  });
}
export const costAmount = (cents: number) =>
  (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const csvCell = (value: string | number) => {
  let text = String(value);
  if (
    typeof value === "string" &&
    (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
  )
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export function shoppingListCsv(p: Project) {
  const rows: (string | number)[][] = [
    [
      "Floor",
      "Room",
      "Item",
      "Type",
      "Width (m)",
      "Depth (m)",
      "Height (m)",
      "Color",
      "Finish",
      "Quantity",
      "Unit price",
      "Subtotal",
    ],
  ];
  const groups = costBreakdown(p);
  for (const group of groups)
    for (const item of group.items) {
      const f = item.furniture;
      rows.push([
        group.floor,
        group.room,
        f.name,
        f.kind,
        f.width,
        f.depth,
        f.height,
        f.material.color,
        f.material.texture,
        item.quantity,
        (item.unitCents / 100).toFixed(2),
        (item.totalCents / 100).toFixed(2),
      ]);
    }
  rows.push([
    "",
    "",
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    groups.reduce((n, g) => n + g.items.reduce((n, i) => n + i.quantity, 0), 0),
    "",
    (groups.reduce((n, g) => n + g.totalCents, 0) / 100).toFixed(2),
  ]);
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
