import { z } from "zod";
import { validPolygon, distance } from "./geometry";
import { insertWall } from "./topology";
export const point = z.object({
  x: z.number().finite().min(-100).max(100),
  z: z.number().finite().min(-100).max(100),
});
export const material = z.object({
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  roughness: z.number().min(0).max(1),
  metalness: z.number().min(0).max(1),
  texture: z
    .enum(["solid", "wood", "tile", "concrete", "carpet"])
    .default("solid"),
  textureScale: z.number().min(0.1).max(10).default(1),
  textureRotation: z.number().min(0).max(360).default(0),
});
export const kinds = [
  "sofa",
  "chair",
  "table",
  "bed",
  "wardrobe",
  "desk",
  "shelf",
  "rug",
  "plant",
  "lamp",
  "bathtub",
  "sink",
  "toilet",
  "fridge",
  "cabinet",
  "painting",
  "bench",
  "lounger",
  "umbrella",
  "pergola",
  "planter",
  "tree",
  "hedge",
  "fence",
  "grill",
  "ottoman",
  "nightstand",
  "dining",
  "stairs",
] as const;
export const furnitureSchema = z.object({
  id: z.string(),
  kind: z.enum(kinds),
  name: z.string().max(100),
  x: point.shape.x,
  z: point.shape.z,
  width: z.number().min(0.1).max(10),
  depth: z.number().min(0.1).max(10),
  height: z.number().min(0.02).max(5),
  rotation: z.number().finite(),
  locked: z.boolean(),
  material,
  price: z.number().min(0).default(0),
  light: z
    .object({
      enabled: z.boolean(),
      brightness: z.number().min(0).max(200),
      temperature: z.number().min(1800).max(6500),
    })
    .optional(),
  model: z
    .object({
      data: z
        .string()
        .max(4_000_000)
        .regex(
          /^data:(model\/gltf-binary|model\/gltf\+json);base64,[A-Za-z0-9+/=]+$/,
        ),
      license: z.string().max(200),
      attribution: z.string().max(500),
    })
    .optional(),
});
export const wallSchema = z.object({
  id: z.string(),
  curveId: z.string().optional(),
  a: point,
  b: point,
  height: z.number().min(0.5).max(6),
  thickness: z.number().min(0.05).max(1),
  material,
});
export const surfaceKinds = [
  "patio",
  "grass",
  "path",
  "pool",
  "terrain",
] as const;
export const surfaceSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  kind: z.enum(surfaceKinds),
  x: point.shape.x,
  z: point.shape.z,
  width: z.number().min(0.3).max(100),
  depth: z.number().min(0.3).max(100),
  elevation: z.number().min(-3).max(3).default(0),
  slope: z.number().min(-2).max(2).default(0),
  rotation: z.number().finite().default(0),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
const singleFloorSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    updatedAt: z.string(),
    revision: z.number().int().nonnegative(),
    cloudRevision: z.number().int().nonnegative().default(0),
    rooms: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().max(100),
          points: z
            .array(point)
            .min(3)
            .max(100)
            .refine(
              validPolygon,
              "Room boundary must be a simple polygon with positive area",
            ),
          material,
          visible: z.boolean(),
          type: z
            .enum([
              "other",
              "living",
              "bedroom",
              "kitchen",
              "bathroom",
              "office",
            ])
            .default("other"),
        }),
      )
      .max(100),
    walls: z.array(wallSchema).max(1000),
    surfaces: z.array(surfaceSchema).max(200).default([]),
    openings: z
      .array(
        z.object({
          id: z.string(),
          wallId: z.string(),
          kind: z.enum(["door", "window"]),
          offset: z.number().min(0).max(1),
          width: z.number().min(0.3).max(4),
          height: z.number().min(0.3).max(3),
          sill: z.number().min(0).max(2),
          style: z.enum(["classic", "sliding", "double"]).optional(),
        }),
      )
      .max(500),
    furniture: z.array(furnitureSchema).max(1000),
    lighting: z.object({ night: z.boolean(), sun: z.number().min(0).max(360) }),
    camera: z
      .object({
        preset: z
          .enum(["Isometric", "Top", "Front", "Back", "Left", "Right"])
          .default("Isometric"),
        speed: z.number().min(0.5).max(5).default(2),
        eyeHeight: z.number().min(1).max(2.2).default(1.65),
      })
      .default({ preset: "Isometric", speed: 2, eyeHeight: 1.65 }),
    measurements: z
      .array(z.object({ id: z.string(), a: point, b: point }))
      .max(500)
      .default([]),
    units: z.enum(["m", "cm", "ft", "in"]),
  })
  .superRefine((p, ctx) => {
    const ids = [
      ...p.rooms,
      ...p.walls,
      ...p.openings,
      ...p.furniture,
      ...p.measurements,
      ...p.surfaces,
    ].map((o) => o.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Object IDs must be unique" });
    p.walls.forEach((w) => {
      if (distance(w.a, w.b) < 0.05)
        ctx.addIssue({
          code: "custom",
          message: "Walls must have positive length",
        });
    });
    p.openings.forEach((o, i) => {
      const w = p.walls.find((w) => w.id === o.wallId);
      if (
        w &&
        p.openings
          .slice(i + 1)
          .some(
            (other) =>
              other.wallId === o.wallId &&
              Math.abs(other.offset - o.offset) * distance(w.a, w.b) <
                (other.width + o.width) / 2 - 0.001,
          )
      )
        ctx.addIssue({ code: "custom", message: "Openings cannot overlap" });
      if (
        !w ||
        o.offset * distance(w.a, w.b) < o.width / 2 - 0.001 ||
        (1 - o.offset) * distance(w.a, w.b) < o.width / 2 - 0.001 ||
        o.sill + o.height > w.height + 0.001
      )
        ctx.addIssue({
          code: "custom",
          message: "Opening must fit inside its parent wall",
        });
    });
  });
const floorInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  elevation: z.number().min(-30).max(100),
});
export const projectSchema = singleFloorSchema
  .and(
    z.object({
      activeFloor: floorInfoSchema.optional(),
      floors: z
        .array(z.object({ info: floorInfoSchema, plan: singleFloorSchema }))
        .max(19)
        .optional(),
    }),
  )
  .superRefine((p, ctx) => {
    const ids = [
      p.activeFloor?.id ?? "ground",
      ...(p.floors ?? []).map((f) => f.info.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Floor IDs must be unique" });
  });
export const floorPlanSchema = singleFloorSchema;
export type Project = z.infer<typeof projectSchema>;
export type Furniture = z.infer<typeof furnitureSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type Point = z.infer<typeof point>;
export type Surface = z.infer<typeof surfaceSchema>;
export type Opening = Project["openings"][number];
export const surfaceColors: Record<Surface["kind"], string> = {
  patio: "#b9ac96",
  grass: "#799258",
  path: "#c4b9a6",
  pool: "#60b7ca",
  terrain: "#9b8865",
};
export const mat = (color: string) => ({
  color,
  roughness: 0.75,
  metalness: 0,
  texture: "solid" as "solid" | "wood" | "tile" | "concrete" | "carpet",
  textureScale: 1,
  textureRotation: 0,
});
export const catalog: {
  kind: Furniture["kind"];
  name: string;
  category: string;
  size: [number, number, number];
  color: string;
}[] = [
  {
    kind: "stairs",
    name: "Straight staircase",
    category: "Living",
    size: [1.1, 3.6, 3],
    color: "#b39875",
  },
  {
    kind: "bench",
    name: "Garden bench",
    category: "Outdoor",
    size: [1.6, 0.65, 0.9],
    color: "#98734f",
  },
  {
    kind: "lounger",
    name: "Poolside sun lounger",
    category: "Outdoor",
    size: [0.8, 2, 0.7],
    color: "#d6c6a5",
  },
  {
    kind: "umbrella",
    name: "Patio umbrella",
    category: "Outdoor",
    size: [2.6, 2.6, 2.5],
    color: "#eadcc4",
  },
  {
    kind: "pergola",
    name: "Timber pergola",
    category: "Outdoor",
    size: [3, 3, 2.6],
    color: "#a38058",
  },
  {
    kind: "planter",
    name: "Raised garden planter",
    category: "Outdoor",
    size: [1.2, 0.55, 0.7],
    color: "#678453",
  },
  {
    kind: "tree",
    name: "Garden tree",
    category: "Outdoor",
    size: [2, 2, 3.5],
    color: "#64804e",
  },
  {
    kind: "hedge",
    name: "Privacy hedge",
    category: "Outdoor",
    size: [2, 0.65, 1.5],
    color: "#557044",
  },
  {
    kind: "fence",
    name: "Timber garden fence",
    category: "Outdoor",
    size: [2, 0.15, 1.2],
    color: "#aa8961",
  },
  {
    kind: "grill",
    name: "Outdoor barbecue grill",
    category: "Outdoor",
    size: [1.1, 0.6, 1.1],
    color: "#45494a",
  },
  {
    kind: "ottoman",
    name: "Upholstered ottoman",
    category: "Living",
    size: [0.85, 0.65, 0.45],
    color: "#b39479",
  },
  {
    kind: "nightstand",
    name: "Bedside drawer table",
    category: "Bedroom",
    size: [0.5, 0.4, 0.55],
    color: "#b09476",
  },
  {
    kind: "dining",
    name: "Rectangular dining table",
    category: "Kitchen",
    size: [1.8, 0.9, 0.76],
    color: "#98734f",
  },
  {
    kind: "sofa",
    name: "Linen three-seat sofa",
    category: "Living",
    size: [2.4, 0.95, 0.85],
    color: "#bcb5a4",
  },
  {
    kind: "chair",
    name: "Oak lounge chair",
    category: "Living",
    size: [0.8, 0.8, 0.85],
    color: "#b18562",
  },
  {
    kind: "table",
    name: "Round coffee table",
    category: "Living",
    size: [1.1, 1.1, 0.42],
    color: "#8c6246",
  },
  {
    kind: "rug",
    name: "Woven wool rug",
    category: "Living",
    size: [3, 2, 0.03],
    color: "#d9cbbb",
  },
  {
    kind: "shelf",
    name: "Open oak bookshelf",
    category: "Office",
    size: [1.2, 0.35, 1.8],
    color: "#a7815c",
  },
  {
    kind: "bed",
    name: "Upholstered queen bed",
    category: "Bedroom",
    size: [1.7, 2.2, 1],
    color: "#c7bba9",
  },
  {
    kind: "wardrobe",
    name: "Double wardrobe",
    category: "Bedroom",
    size: [1.8, 0.6, 2.2],
    color: "#b09476",
  },
  {
    kind: "desk",
    name: "Writing desk",
    category: "Office",
    size: [1.4, 0.65, 0.75],
    color: "#b09476",
  },
  {
    kind: "plant",
    name: "Indoor olive tree",
    category: "Decor",
    size: [0.65, 0.65, 1.6],
    color: "#65764f",
  },
  {
    kind: "lamp",
    name: "Arc floor lamp",
    category: "Lighting",
    size: [0.5, 0.5, 1.65],
    color: "#d9b36d",
  },
  {
    kind: "cabinet",
    name: "Kitchen base cabinet",
    category: "Kitchen",
    size: [1.2, 0.6, 0.9],
    color: "#9eaa98",
  },
  {
    kind: "fridge",
    name: "Refrigerator",
    category: "Kitchen",
    size: [0.75, 0.7, 1.85],
    color: "#c5c8c5",
  },
  {
    kind: "bathtub",
    name: "Freestanding bathtub",
    category: "Bathroom",
    size: [1.7, 0.8, 0.6],
    color: "#f4f1eb",
  },
  {
    kind: "sink",
    name: "Vanity sink",
    category: "Bathroom",
    size: [0.9, 0.5, 0.85],
    color: "#eee9df",
  },
  {
    kind: "toilet",
    name: "Modern toilet",
    category: "Bathroom",
    size: [0.4, 0.65, 0.75],
    color: "#f4f1eb",
  },
  {
    kind: "painting",
    name: "Abstract wall artwork",
    category: "Decor",
    size: [1, 0.1, 0.8],
    color: "#aa715b",
  },
];
export function makeFurniture(
  kind: Furniture["kind"],
  x = 3,
  z = 3,
): Furniture {
  const c = catalog.find((c) => c.kind === kind)!;
  return {
    id: crypto.randomUUID(),
    kind,
    name: c.name,
    x,
    z,
    width: c.size[0],
    depth: c.size[1],
    height: c.size[2],
    rotation: 0,
    locked: false,
    material: mat(c.color),
    price: 0,
  };
}
export function addRoom(
  p: Project,
  x: number,
  z: number,
  w: number,
  d: number,
) {
  const points = [
    { x, z },
    { x: x + w, z },
    { x: x + w, z: z + d },
    { x, z: z + d },
  ];
  addPolygonRoom(p, points);
}
export function addPolygonRoom(p: Project, points: Point[]) {
  p.rooms.push({
    id: crypto.randomUUID(),
    name: `Room ${p.rooms.length + 1}`,
    points,
    material: mat("#c6ae8d"),
    visible: true,
    type: "other",
  });
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    insertWall(p, {
      id: crypto.randomUUID(),
      a,
      b,
      height: 2.7,
      thickness: 0.15,
      material: mat("#e9e5da"),
    });
  });
}
export function template(name = "Living Room"): Project {
  const p: Project = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name: `${name} concept`,
    updatedAt: new Date().toISOString(),
    revision: 0,
    cloudRevision: 0,
    rooms: [],
    walls: [],
    surfaces: [],
    openings: [],
    furniture: [],
    lighting: { night: false, sun: 45 },
    camera: { preset: "Isometric", speed: 2, eyeHeight: 1.65 },
    measurements: [],
    units: "m",
  };
  if (name === "Outdoor Patio") {
    p.surfaces = [
      {
        id: crypto.randomUUID(),
        name: "Lawn",
        kind: "grass",
        x: 3.5,
        z: 2.5,
        width: 10,
        depth: 8,
        elevation: -0.02,
        slope: 0,
        rotation: 0,
        color: "#799258",
      },
      {
        id: crypto.randomUUID(),
        name: "Dining patio",
        kind: "patio",
        x: 2,
        z: 2.5,
        width: 4,
        depth: 4,
        elevation: 0,
        slope: 0,
        rotation: 0,
        color: "#b9ac96",
      },
      {
        id: crypto.randomUUID(),
        name: "Garden path",
        kind: "path",
        x: 5,
        z: 2.5,
        width: 1,
        depth: 7,
        elevation: 0,
        slope: 0,
        rotation: 0,
        color: "#c4b9a6",
      },
    ];
    p.furniture = [
      makeFurniture("dining", 2, 2.5),
      makeFurniture("bench", 6.8, 1),
      makeFurniture("planter", 0.5, 0.5),
      makeFurniture("grill", 2, 4.8),
      makeFurniture("lounger", 6.8, 3.8),
    ];
    return p;
  }
  addRoom(p, 0, 0, 7, 5);
  p.rooms[0].name = name;
  p.rooms[0].material.texture =
    name === "Bathroom" || name === "Kitchen" ? "tile" : "wood";
  const ks: Furniture["kind"][] =
    name === "Empty Room"
      ? []
      : name === "Bedroom"
        ? ["bed", "wardrobe", "lamp", "rug"]
        : name === "Kitchen"
          ? ["cabinet", "fridge", "table", "chair"]
          : name === "Bathroom"
            ? ["bathtub", "sink", "toilet"]
            : name === "Office"
              ? ["desk", "chair", "shelf", "plant"]
              : ["rug", "sofa", "table", "chair", "plant", "lamp"];
  p.furniture = ks.map((k, i) =>
    makeFurniture(
      k,
      [3.5, 3.5, 3.5, 5.7, 0.8, 6.1][i],
      [2.8, 1, 2.8, 3.5, 1, 1][i],
    ),
  );
  const layouts: Record<string, [number, number][]> = {
    Bedroom: [
      [3.5, 2.5],
      [1.2, 0.5],
      [5, 0.8],
      [3.5, 2.7],
    ],
    Kitchen: [
      [1.3, 0.5],
      [6, 0.6],
      [3.7, 2.6],
      [3.7, 3.9],
    ],
    Bathroom: [
      [1.3, 2.6],
      [4, 0.5],
      [5.8, 3.8],
    ],
    Office: [
      [3.5, 1],
      [3.5, 2.2],
      [1, 0.4],
      [6, 1],
    ],
  };
  if (layouts[name])
    p.furniture.forEach((o, i) => {
      o.x = layouts[name][i][0];
      o.z = layouts[name][i][1];
    });
  p.rooms[0].type =
    (
      {
        Bedroom: "bedroom",
        Kitchen: "kitchen",
        Bathroom: "bathroom",
        Office: "office",
        "Living Room": "living",
      } as const
    )[name as "Bedroom"] ?? "other";
  if (name === "Studio Apartment") {
    p.rooms[0].name = "Living & dining";
    p.rooms[0].type = "living";
    addRoom(p, 7, 0, 4, 5);
    p.rooms[1].name = "Bedroom";
    p.rooms[1].type = "bedroom";
    p.rooms[1].material.texture = "wood";
    p.furniture.push(
      makeFurniture("bed", 9, 2.7),
      makeFurniture("wardrobe", 9, 0.5),
    );
    const shared = p.walls.find((w) => w.a.x === 7 && w.b.x === 7);
    if (shared)
      p.openings.push({
        id: crypto.randomUUID(),
        wallId: shared.id,
        kind: "door",
        offset: 0.25,
        width: 0.9,
        height: 2.1,
        sill: 0,
      });
  }
  p.openings.push(
    ...([
      {
        id: crypto.randomUUID(),
        wallId: p.walls[0].id,
        kind: "window",
        offset: 0.5,
        width: 2.4,
        height: 1.4,
        sill: 0.85,
      },
      {
        id: crypto.randomUUID(),
        wallId: p.walls[3].id,
        kind: "door",
        offset: 0.7,
        width: 0.9,
        height: 2.1,
        sill: 0,
      },
    ] as Project["openings"]),
  );
  return p;
}
