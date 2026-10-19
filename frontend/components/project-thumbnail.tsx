import type { Point, Project } from "@/lib/model";
import { corners, wallCorners } from "@/lib/geometry";

const iso = (p: Point, height = 0): Point => ({
  x: (p.x - p.z) * 0.866,
  z: (p.x + p.z) * 0.5 - height,
});
const points = (p: Point[]) => p.map((q) => `${q.x},${q.z}`).join(" ");
// Lightweight, deterministic previews of saved geometry; no extra WebGL contexts or cached images.
export default function ProjectThumbnail({
  project: p,
  viewBox,
}: {
  project: Project;
  viewBox?: string;
}) {
  const solids = [
    ...p.walls.flatMap((w) => {
      const openings = p.openings
        .filter((o) => o.wallId === w.id)
        .sort((a, b) => a.offset - b.offset);
      const length = Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z);
      const pieces: {
        id: string;
        base: Point[];
        height: number;
        color: string;
      }[] = [];
      const at = (t: number) => ({
        x: w.a.x + (w.b.x - w.a.x) * t,
        z: w.a.z + (w.b.z - w.a.z) * t,
      });
      const segment = (
        a: number,
        b: number,
        height: number,
        color = w.material.color,
      ) => {
        if (b > a && height > 0)
          pieces.push({
            id: w.id + ":" + pieces.length,
            base: wallCorners({ ...w, a: at(a), b: at(b) }),
            height,
            color,
          });
      };
      let cursor = 0;
      for (const opening of openings) {
        const a = opening.offset - opening.width / (2 * length),
          b = opening.offset + opening.width / (2 * length);
        segment(cursor, a, Math.min(w.height, 1.25));
        if (opening.kind === "window")
          segment(a, b, Math.min(w.height, 1.25), "#bddae0");
        cursor = b;
      }
      segment(cursor, 1, Math.min(w.height, 1.25));
      return pieces;
    }),
    ...p.furniture.map((f) => ({
      id: f.id,
      base: corners(f),
      height: f.height,
      color: f.material.color,
    })),
  ].sort(
    (a, b) =>
      a.base.reduce((n, q) => n + q.x + q.z, 0) / a.base.length -
      b.base.reduce((n, q) => n + q.x + q.z, 0) / b.base.length,
  );
  const bounds = [
    ...p.rooms.flatMap((r) => r.points.map((q) => iso(q))),
    ...p.surfaces.flatMap((s) => corners(s).map((q) => iso(q, s.elevation))),
    ...solids.flatMap((s) => s.base.flatMap((q) => [iso(q), iso(q, s.height)])),
  ];
  const minX = bounds.length ? Math.min(...bounds.map((q) => q.x)) - 0.8 : -1;
  const minZ = bounds.length ? Math.min(...bounds.map((q) => q.z)) - 0.8 : -1;
  const width = bounds.length
    ? Math.max(...bounds.map((q) => q.x)) - minX + 0.8
    : 10;
  const height = bounds.length
    ? Math.max(...bounds.map((q) => q.z)) - minZ + 0.8
    : 8;
  return (
    <svg
      className="design-thumbnail"
      viewBox={viewBox ?? `${minX} ${minZ} ${width} ${height}`}
      role="img"
      aria-label={`${p.name}: ${p.activeFloor?.name ?? "Ground floor"} design preview`}
    >
      <title>
        {p.name} — {p.activeFloor?.name ?? "Ground floor"}
      </title>
      {p.surfaces.map((s) => (
        <polygon
          key={s.id}
          points={points(corners(s).map((q) => iso(q, s.elevation)))}
          fill={s.color}
          stroke="#766e60"
          strokeWidth={0.025}
        />
      ))}
      {p.rooms.map((r) => (
        <polygon
          key={r.id}
          points={points(r.points.map((q) => iso(q)))}
          fill={r.material.color}
          stroke="#938976"
          strokeWidth={0.025}
        />
      ))}
      {solids.map((s) => (
        <g key={s.id}>
          {s.base.map((q, i) => {
            const next = s.base[(i + 1) % s.base.length];
            return (
              <g key={i}>
                <polygon
                  points={points([
                    iso(q),
                    iso(next),
                    iso(next, s.height),
                    iso(q, s.height),
                  ])}
                  fill={s.color}
                />
                <polygon
                  points={points([
                    iso(q),
                    iso(next),
                    iso(next, s.height),
                    iso(q, s.height),
                  ])}
                  fill="#000"
                  opacity={i % 2 ? 0.12 : 0.22}
                />
              </g>
            );
          })}
          <polygon
            points={points(s.base.map((q) => iso(q, s.height)))}
            fill={s.color}
            stroke="#594e4130"
            strokeWidth={0.025}
          />
        </g>
      ))}
      {!bounds.length && (
        <text x={4} y={3} fontSize={0.5} textAnchor="middle" fill="#686a60">
          Empty floor
        </text>
      )}
    </svg>
  );
}

export function comparisonViewBox(projects: Project[]) {
  const pts = projects.flatMap((p) => [
    ...p.rooms.flatMap((r) => r.points.map((q) => iso(q))),
    ...p.surfaces.flatMap((s) => corners(s).map((q) => iso(q, s.elevation))),
    ...p.walls.flatMap((w) =>
      wallCorners(w).flatMap((q) => [iso(q), iso(q, Math.min(w.height, 1.25))]),
    ),
    ...p.furniture.flatMap((f) =>
      corners(f).flatMap((q) => [iso(q), iso(q, f.height)]),
    ),
  ]);
  if (!pts.length) return "-1 -1 10 8";
  const x = Math.min(...pts.map((p) => p.x)) - 0.8,
    z = Math.min(...pts.map((p) => p.z)) - 0.8;
  return [
    x,
    z,
    Math.max(...pts.map((p) => p.x)) - x + 0.8,
    Math.max(...pts.map((p) => p.z)) - z + 0.8,
  ].join(" ");
}
