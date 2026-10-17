import { floorPlanSchema, template, type Project } from "./model";

export const groundFloor = { id: "ground", name: "Ground floor", elevation: 0 };
export function floorList(p: Project) {
  return [
    p.activeFloor ?? groundFloor,
    ...(p.floors ?? []).map((f) => f.info),
  ].sort((a, b) => a.elevation - b.elevation);
}
const planKeys = [
  "rooms",
  "walls",
  "openings",
  "furniture",
  "surfaces",
  "measurements",
] as const;
export function switchFloor(p: Project, id: string) {
  if ((p.activeFloor ?? groundFloor).id === id) return;
  const index = (p.floors ?? []).findIndex((f) => f.info.id === id);
  if (index < 0) throw new Error("Floor not found");
  const next = p.floors![index];
  const current = {
    info: p.activeFloor ?? { ...groundFloor },
    plan: floorPlanSchema.parse(p),
  };
  p.floors!.splice(index, 1, current);
  for (const key of planKeys)
    Object.assign(p, { [key]: structuredClone(next.plan[key]) });
  p.activeFloor = next.info;
}
export function addFloor(p: Project) {
  if ((p.floors?.length ?? 0) >= 19)
    throw new Error("A project supports up to 20 floors");
  const elevation = Math.max(...floorList(p).map((f) => f.elevation)) + 3;
  const info = {
    id: crypto.randomUUID(),
    name: `Floor ${floorList(p).length + 1}`,
    elevation,
  };
  const plan = template("Empty Room");
  plan.rooms = [];
  plan.walls = [];
  plan.openings = [];
  p.floors ??= [];
  p.floors.push({ info, plan: floorPlanSchema.parse(plan) });
  switchFloor(p, info.id);
}

export function deleteActiveFloor(p: Project) {
  const id = (p.activeFloor ?? groundFloor).id;
  const next = floorList(p).find((f) => f.id !== id);
  if (!next) throw new Error("Keep at least one floor");
  switchFloor(p, next.id);
  p.floors = p.floors!.filter((f) => f.info.id !== id);
}
