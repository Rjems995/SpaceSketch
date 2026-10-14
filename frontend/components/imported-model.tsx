"use client";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Vector3, Mesh, MeshStandardMaterial, Color } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Furniture } from "@/lib/model";
export default function ImportedModel({ o }: { o: Furniture }) {
  const { scene } = useGLTF(o.model!.data);
  const model = useMemo(() => {
    const root = clone(scene);
    const box = new Box3().setFromObject(root),
      size = box.getSize(new Vector3()),
      center = box.getCenter(new Vector3());
    root.position.set(-center.x, -box.min.y, -center.z);
    root.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = child.receiveShadow = true;
        const source = Array.isArray(child.material)
          ? child.material
          : [child.material];
        const materials = source.map((material) => {
          const copy = material.clone();
          if (copy instanceof MeshStandardMaterial) {
            copy.color.multiply(new Color(o.material.color));
            copy.roughness = o.material.roughness;
            copy.metalness = o.material.metalness;
          }
          return copy;
        });
        child.material = Array.isArray(child.material)
          ? materials
          : materials[0];
      }
    });
    return {
      root,
      scale: [o.width / size.x, o.height / size.y, o.depth / size.z] as [
        number,
        number,
        number,
      ],
    };
  }, [
    scene,
    o.width,
    o.height,
    o.depth,
    o.material.roughness,
    o.material.metalness,
    o.material.color,
  ]);
  return (
    <group scale={model.scale}>
      <primitive object={model.root} />
    </group>
  );
}
