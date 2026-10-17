import { corners, overlap } from "./geometry";
import type { Project } from "./model";

export type PlacementIssue = { ids: string[]; message: string };
// Footprint checks are advisory. Rugs and wall art intentionally overlap objects.
export function placementChecks(p: Project): PlacementIssue[] {
  const pieces = p.furniture.filter(
    (o) => !["rug", "painting"].includes(o.kind),
  );
  const footprints = pieces.map(corners);
  const issues: PlacementIssue[] = [];
  pieces.forEach((a, i) => {
    pieces.slice(i + 1).forEach((b, j) => {
      if (overlap(footprints[i], footprints[i + j + 1]))
        issues.push({
          ids: [a.id, b.id],
          message: `${a.name} overlaps ${b.name}`,
        });
    });
  });
  p.openings
    .filter((o) => o.kind === "door")
    .forEach((door) => {
      const wall = p.walls.find((w) => w.id === door.wallId);
      if (!wall) return;
      // Reserve 90 cm of approach space on BOTH sides, independent of hinge style.
      const clearance = corners({
        x: wall.a.x + (wall.b.x - wall.a.x) * door.offset,
        z: wall.a.z + (wall.b.z - wall.a.z) * door.offset,
        width: door.width,
        depth: 1.8 + wall.thickness,
        rotation:
          (Math.atan2(wall.b.z - wall.a.z, wall.b.x - wall.a.x) * 180) /
          Math.PI,
      });
      pieces.forEach((o, i) => {
        if (overlap(clearance, footprints[i]))
          issues.push({
            ids: [o.id, door.id],
            message: `${o.name} blocks door approach`,
          });
      });
    });
  return issues;
}
