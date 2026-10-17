import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Surface } from "@/lib/model";
import { floorTexture } from "@/lib/materials";
import { Box } from "./furniture-model";
export default function OutdoorSurface({
  surface: o,
  selected,
  onSelect,
}: {
  surface: Surface;
  selected: boolean;
  onSelect: () => void;
}) {
  const texture = useMemo(() => {
    const t = floorTexture(
      o.kind === "patio"
        ? "tile"
        : o.kind === "path"
          ? "concrete"
          : o.kind === "grass"
            ? "grass"
            : "terrain",
    );
    t.repeat.set(o.width / 2, o.depth / 2);
    return t;
  }, [o.kind, o.width, o.depth]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const w = o.width / 2,
      d = o.depth / 2,
      slope = o.kind === "terrain" ? o.slope : 0;
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-w, 0, -d, w, 0, -d, w, slope, d, -w, slope, d],
        3,
      ),
    );
    g.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
    );
    g.setIndex([0, 2, 1, 0, 3, 2]);
    g.computeVertexNormals();
    return g;
  }, [o.width, o.depth, o.kind, o.slope]);
  useEffect(
    () => () => {
      texture.dispose();
      geometry.dispose();
    },
    [texture, geometry],
  );
  return (
    <group
      position={[o.x, o.elevation, o.z]}
      rotation={[0, (-o.rotation * Math.PI) / 180, 0]}
      userData={{ design: true }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh geometry={geometry} receiveShadow>
        {o.kind === "pool" ? (
          <meshPhysicalMaterial
            color={o.color}
            roughness={0.12}
            metalness={0.2}
            clearcoat={1}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={selected ? "#b5bd8e" : o.color}
            map={texture}
            roughness={0.95}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>
      {o.kind === "pool" && (
        <>
          {[-1, 1].map((sign) => (
            <group key={sign}>
              <Box
                position={[(sign * o.width) / 2, 0.04, 0]}
                size={[0.16, 0.15, o.depth + 0.16]}
                color={selected ? "#c9986e" : "#dcd4c5"}
              />
              <Box
                position={[0, 0.04, (sign * o.depth) / 2]}
                size={[o.width, 0.15, 0.16]}
                color={selected ? "#c9986e" : "#dcd4c5"}
              />
            </group>
          ))}
        </>
      )}
    </group>
  );
}
