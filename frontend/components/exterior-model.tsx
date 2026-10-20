import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { Surface } from "@/lib/model";
import { mat } from "@/lib/model";
import { roofFaces } from "@/lib/exteriors";
import { Box } from "./furniture-model";
import DesignMaterial from "./design-material";
export default function ExteriorModel({
  surface: o,
  selected,
  onSelect,
}: {
  surface: Surface;
  selected: boolean;
  onSelect: () => void;
}) {
  const h = o.height ?? 1.2,
    w = o.width,
    d = o.depth;
  const material = {
    ...(o.finish ?? mat(o.color)),
    color: selected ? "#b4be91" : o.color,
  };
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      positions: number[] = [],
      uv: number[] = [];
    if (o.kind === "roof")
      for (const face of roofFaces(o))
        for (let i = 1; i < face.length - 1; i++)
          for (const v of [face[0], face[i], face[i + 1]]) {
            positions.push(...v);
            uv.push(v[0] / o.width, v[2] / o.depth);
          }
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }, [o]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const box = (
    key: string,
    position: [number, number, number],
    size: [number, number, number],
  ) => (
    <Box
      key={key}
      position={position}
      size={size}
      color={material.color}
      material={material}
    />
  );
  const rail = (length: number, z: number, side = false) => (
    <group
      position={side ? [z, 0.12, 0] : [0, 0.12, z]}
      rotation={side ? [0, Math.PI / 2, 0] : [0, 0, 0]}
    >
      {box("top", [0, h, 0], [length, 0.08, 0.08])}
      {box("low", [0, 0.15, 0], [length, 0.06, 0.06])}
      {Array.from(
        { length: Math.min(64, Math.ceil(length / 0.55)) + 1 },
        (_, i) => {
          const count = Math.min(64, Math.ceil(length / 0.55));
          return box(
            "p" + i,
            [-length / 2 + (i * length) / count, h / 2, 0],
            [0.065, h, 0.065],
          );
        },
      )}
    </group>
  );
  return (
    <group
      name={"exterior-" + o.id}
      position={[o.x, o.elevation, o.z]}
      rotation={[0, (-o.rotation * Math.PI) / 180, 0]}
      userData={{ design: true }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {o.kind === "roof" ? (
        o.roofStyle === "flat" ? (
          box("flat", [0, 0.08, 0], [w, 0.16, d])
        ) : (
          <mesh geometry={geometry} castShadow receiveShadow>
            <DesignMaterial material={material} doubleSide />
          </mesh>
        )
      ) : o.kind === "balcony" ? (
        <>
          {box("deck", [0, 0, 0], [w, 0.2, d])}
          {rail(w, d / 2)}
          {rail(d, -w / 2, true)}
          {rail(d, w / 2, true)}
        </>
      ) : (
        <>
          {o.fenceStyle === "solid" ? (
            box("panel", [0, h / 2, 0], [w, h, d])
          ) : (
            <>
              {box("rail-a", [0, h * 0.3, 0], [w, 0.08, d])}
              {box("rail-b", [0, h * 0.75, 0], [w, 0.08, d])}
              {Array.from(
                { length: Math.min(100, Math.ceil(w / 0.18)) },
                (_, i) => {
                  const count = Math.min(100, Math.ceil(w / 0.18));
                  return box(
                    "slat" + i,
                    [-w / 2 + ((i + 0.5) * w) / count, h / 2, 0],
                    [(w / count) * 0.65, h, d],
                  );
                },
              )}
            </>
          )}
          {[-1, 1].map((sign) =>
            box(
              "post" + sign,
              [(sign * w) / 2, h / 2, 0],
              [0.12, h + 0.1, Math.max(0.12, d)],
            ),
          )}
        </>
      )}
    </group>
  );
}
