import { mat } from "./model";
export const materialPresets = [
  {
    name: "Oak wood",
    category: "Wood",
    material: { ...mat("#c6ae8d"), texture: "wood" as const },
  },
  {
    name: "Walnut wood",
    category: "Wood",
    material: { ...mat("#76523b"), texture: "wood" as const },
  },
  {
    name: "Ivory tile",
    category: "Tile",
    material: { ...mat("#eee8dc"), texture: "tile" as const, roughness: 0.25 },
  },
  {
    name: "Slate tile",
    category: "Tile",
    material: { ...mat("#656b70"), texture: "tile" as const, roughness: 0.4 },
  },
  {
    name: "Raw concrete",
    category: "Concrete",
    material: {
      ...mat("#bfc1bd"),
      texture: "concrete" as const,
      roughness: 0.95,
    },
  },
  {
    name: "Linen fabric",
    category: "Fabric",
    material: { ...mat("#ded1bc"), texture: "carpet" as const, roughness: 1 },
  },
  {
    name: "Sage fabric",
    category: "Fabric",
    material: { ...mat("#96a58b"), texture: "carpet" as const, roughness: 1 },
  },
  {
    name: "Warm plaster",
    category: "Wall finishes",
    material: { ...mat("#e9e5da"), texture: "concrete" as const, roughness: 1 },
  },
  { name: "Clay paint", category: "Wall finishes", material: mat("#c39880") },
];
