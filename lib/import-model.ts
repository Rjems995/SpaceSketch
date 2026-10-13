import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { makeFurniture, Furniture, mat } from "./model";
// Only embedded assets are accepted. A dropped model cannot fetch arbitrary URLs.
export function validateGltfDocument(document: Record<string, unknown>) {
  for (const field of ["buffers", "images"]) {
    const entries = document[field];
    if (entries !== undefined && !Array.isArray(entries))
      throw new Error(`Invalid glTF ${field}.`);
    for (const entry of (entries ?? []) as { uri?: unknown }[]) {
      if (
        entry.uri !== undefined &&
        (typeof entry.uri !== "string" ||
          !/^data:[^,]+;base64,[A-Za-z0-9+/=]+$/.test(entry.uri))
      )
        throw new Error(
          "Use a self-contained glTF with embedded buffers and images, or a GLB. External URLs are not allowed.",
        );
    }
  }
}
export async function importFurnitureModel(
  file: File,
  license: string,
  attribution: string,
): Promise<Furniture> {
  if (file.size > 2_900_000)
    throw new Error(
      "Models must be smaller than 2.9 MB to fit in a portable project backup.",
    );
  const bytes = await file.arrayBuffer();
  const glb = file.name.toLowerCase().endsWith(".glb");
  let input: ArrayBuffer | string = bytes;
  if (glb) {
    const view = new DataView(bytes);
    if (
      bytes.byteLength < 20 ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== bytes.byteLength
    )
      throw new Error("Invalid GLB 2.0 file.");
    const length = view.getUint32(12, true);
    if (
      20 + length > bytes.byteLength ||
      view.getUint32(16, true) !== 0x4e4f534a
    )
      throw new Error("Missing GLB JSON chunk.");
    validateGltfDocument(
      JSON.parse(new TextDecoder().decode(bytes.slice(20, 20 + length)).trim()),
    );
  } else {
    input = new TextDecoder().decode(bytes);
    validateGltfDocument(JSON.parse(input));
  }
  const gltf = await new GLTFLoader().parseAsync(input, "");
  const box = new Box3().setFromObject(gltf.scene),
    size = box.getSize(new Vector3());
  if (!Number.isFinite(size.x) || Math.min(size.x, size.y, size.z) <= 0)
    throw new Error("The model has no usable 3D geometry.");
  if (Math.max(size.x, size.y, size.z) > 10 || size.y > 5)
    throw new Error(
      "Model dimensions exceed 10 m wide/deep or 5 m high. Export the model in meters.",
    );
  let binary = "";
  new Uint8Array(bytes).forEach((b) => (binary += String.fromCharCode(b)));
  return {
    ...makeFurniture("cabinet"),
    material: mat("#ffffff"),
    name: file.name.replace(/\.(glb|gltf)$/i, "").slice(0, 100),
    width: Math.max(0.1, size.x),
    depth: Math.max(0.1, size.z),
    height: Math.max(0.02, size.y),
    model: {
      data: `data:${glb ? "model/gltf-binary" : "model/gltf+json"};base64,${btoa(binary)}`,
      license: license.slice(0, 200),
      attribution: attribution.slice(0, 500),
    },
  };
}
