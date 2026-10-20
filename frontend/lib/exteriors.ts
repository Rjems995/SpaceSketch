import { mat, type Project, type Surface, exteriorKinds } from "./model";
export const isExterior = (s: Surface) =>
  (exteriorKinds as readonly string[]).includes(s.kind);
export const exteriorFinishes = [
  {
    name: "Warm stucco",
    material: { ...mat("#e8dfcd"), texture: "concrete" as const, roughness: 1 },
  },
  {
    name: "Cedar siding",
    material: { ...mat("#ad815a"), texture: "wood" as const },
  },
  {
    name: "Slate roofing",
    material: { ...mat("#59616a"), texture: "tile" as const },
  },
  {
    name: "Terracotta tiles",
    material: { ...mat("#ac6346"), texture: "tile" as const },
  },
  {
    name: "Dark metal",
    material: { ...mat("#394640"), metalness: 0.75, roughness: 0.35 },
  },
  {
    name: "Pale concrete",
    material: { ...mat("#cbc9bd"), texture: "concrete" as const },
  },
];
export function makeExterior(
  p: Project,
  kind: (typeof exteriorKinds)[number],
): Surface {
  const points = p.walls.flatMap((w) => [w.a, w.b]);
  const minX = points.length ? Math.min(...points.map((q) => q.x)) : 0,
    maxX = points.length ? Math.max(...points.map((q) => q.x)) : 6;
  const minZ = points.length ? Math.min(...points.map((q) => q.z)) : 0,
    maxZ = points.length ? Math.max(...points.map((q) => q.z)) : 5;
  const height = Math.max(2.7, ...p.walls.map((w) => w.height));
  const finish = structuredClone(
    exteriorFinishes[kind === "roof" ? 2 : 1].material,
  );
  return {
    id: crypto.randomUUID(),
    kind,
    name:
      kind === "boundary-fence"
        ? "Boundary fence"
        : kind === "roof"
          ? "Roof"
          : "Balcony",
    x: (minX + maxX) / 2,
    z: kind === "roof" ? (minZ + maxZ) / 2 : Math.min(98, maxZ + 1.2),
    width: kind === "roof" ? Math.min(100, maxX - minX + 0.6) : 4,
    depth:
      kind === "roof"
        ? Math.min(100, maxZ - minZ + 0.6)
        : kind === "balcony"
          ? 2
          : 0.16,
    elevation: kind === "boundary-fence" ? 0 : height,
    height: kind === "roof" ? 1.2 : kind === "balcony" ? 1.1 : 1.5,
    rotation: 0,
    slope: 0,
    color: finish.color,
    finish,
    roofStyle: "gable",
    fenceStyle: "picket",
  };
}
export type Vertex = [number, number, number];
export function roofFaces(o: Surface): Vertex[][] {
  const w = o.width / 2,
    d = o.depth / 2,
    h = o.height ?? 1.2;
  const a: Vertex = [-w, 0, -d],
    b: Vertex = [w, 0, -d],
    c: Vertex = [w, 0, d],
    e: Vertex = [-w, 0, d];
  if (o.roofStyle === "flat") return [[a, b, c, e]];
  if (o.roofStyle === "shed") {
    const b1: Vertex = [w, h, -d],
      a1: Vertex = [-w, h, -d];
    return [
      [a1, b1, c, e],
      [a, b, b1, a1],
      [b, c, b1],
      [e, a, a1],
      [a, e, c, b],
    ];
  }
  const r1: Vertex = [-w, h, 0],
    r2: Vertex = [w, h, 0];
  return [
    [a, b, r2, r1],
    [r1, r2, c, e],
    [a, r1, e],
    [b, c, r2],
    [a, e, c, b],
  ];
}
export function worldVertex(o: Surface, [x, y, z]: Vertex): Vertex {
  const angle = (o.rotation * Math.PI) / 180;
  return [
    o.x + x * Math.cos(angle) - z * Math.sin(angle),
    o.elevation + y,
    o.z + x * Math.sin(angle) + z * Math.cos(angle),
  ];
}

export function exteriorPreviewFaces(o: Surface): Vertex[][] {
  if (o.kind === "roof")
    return roofFaces(o).map((face) => face.map((v) => worldVertex(o, v)));
  const w = o.width / 2,
    d = o.depth / 2,
    h = o.height ?? 1.2;
  const a: Vertex = [-w, 0, -d],
    b: Vertex = [w, 0, -d],
    c: Vertex = [w, 0, d],
    e: Vertex = [-w, 0, d];
  const top = (v: Vertex): Vertex => [v[0], h, v[2]];
  return [
    [a, b, c, e],
    [a, b, top(b), top(a)],
    [b, c, top(c), top(b)],
    [c, e, top(e), top(c)],
    [e, a, top(a), top(e)],
  ].map((face) => face.map((v) => worldVertex(o, v)));
}
