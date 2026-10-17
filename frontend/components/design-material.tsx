"use client";
import { useEffect, useMemo } from "react";
import type { Furniture } from "@/lib/model";
import { floorTexture } from "@/lib/materials";
export default function DesignMaterial({
  material,
  color,
}: {
  material: Furniture["material"];
  color?: string;
}) {
  const texture = useMemo(() => {
    if (material.texture === "solid") return null;
    const t = floorTexture(material.texture);
    t.repeat.set(material.textureScale, material.textureScale);
    t.center.set(0.5, 0.5);
    t.rotation = (material.textureRotation * Math.PI) / 180;
    return t;
  }, [material.texture, material.textureScale, material.textureRotation]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return (
    <meshStandardMaterial
      color={color ?? material.color}
      roughness={material.roughness}
      metalness={material.metalness}
      map={texture}
    />
  );
}
