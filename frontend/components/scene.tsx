"use client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Grid,
  PointerLockControls,
  TransformControls,
} from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import ImportedModel from "./imported-model";
import RenderBoundary from "./render-boundary";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { Furniture, Project } from "@/lib/model";
import { useEditor } from "@/stores/editor";
import { corners, overlap } from "@/lib/geometry";
import { download } from "@/lib/storage";
import { floorTexture } from "@/lib/materials";
import { toast } from "sonner";
import { visibleDesign } from "@/lib/rooms";
function EditableFurniture({
  o,
  walk,
  readOnly,
}: {
  o: Furniture;
  walk: boolean;
  readOnly: boolean;
}) {
  const group = useRef<THREE.Group>(null),
    s = useEditor(),
    selected = s.selected.includes(o.id);
  return (
    <>
      <group
        ref={group}
        name={`furniture-${o.id}`}
        userData={{ design: true }}
        position={[o.x, 0, o.z]}
        rotation={[0, (-o.rotation * Math.PI) / 180, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!readOnly) s.select(o.id, e.shiftKey);
        }}
      >
        {o.model ? (
          <RenderBoundary fallback={<FurnitureModel o={o} />}>
            <Suspense fallback={<FurnitureModel o={o} />}>
              <ImportedModel o={o} />
            </Suspense>
          </RenderBoundary>
        ) : (
          <FurnitureModel o={o} />
        )}{" "}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
            <planeGeometry args={[o.width + 0.12, o.depth + 0.12]} />
            <meshBasicMaterial color="#c4764f" transparent opacity={0.25} />
          </mesh>
        )}
      </group>
      {selected && !o.locked && !walk && !readOnly && (
        <TransformControls
          object={group as React.RefObject<THREE.Object3D>}
          mode={s.transformMode}
          showX={s.transformMode !== "rotate"}
          showY={s.transformMode !== "translate"}
          showZ={s.transformMode !== "rotate"}
          translationSnap={s.snapping ? s.gridStep : null}
          rotationSnap={s.snapping ? Math.PI / 12 : null}
          scaleSnap={s.snapping ? 0.1 : null}
          onMouseUp={() => {
            const g = group.current;
            if (!g) return;
            s.patch(o.id, {
              x: g.position.x,
              z: g.position.z,
              rotation: (-g.rotation.y * 180) / Math.PI,
              width: Math.max(0.1, Math.min(10, o.width * Math.abs(g.scale.x))),
              height: Math.max(
                0.02,
                Math.min(5, o.height * Math.abs(g.scale.y)),
              ),
              depth: Math.max(0.1, Math.min(10, o.depth * Math.abs(g.scale.z))),
            });
            const saved =
              useEditor
                .getState()
                .project?.furniture.find((f) => f.id === o.id) ?? o;
            g.scale.set(1, 1, 1);
            g.position.set(saved.x, 0, saved.z);
            g.rotation.set(0, (-saved.rotation * Math.PI) / 180, 0);
          }}
        />
      )}
    </>
  );
}
function FloorMaterial({
  material,
}: {
  material: Project["rooms"][number]["material"];
}) {
  const texture = useMemo(() => {
    const t = floorTexture(material.texture);
    t.repeat.set(0.5 * material.textureScale, 0.5 * material.textureScale);
    t.rotation = (material.textureRotation * Math.PI) / 180;
    return t;
  }, [material.texture, material.textureScale, material.textureRotation]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <meshStandardMaterial
      color={material.color}
      roughness={material.roughness}
      metalness={material.metalness}
      map={material.texture === "solid" ? null : texture}
    />
  );
}
function Box({
  position,
  size,
  color,
  roughness = 0.7,
  metalness = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}
export function FurnitureModel({ o }: { o: Furniture }) {
  const { width: w, depth: d, height: h, kind: k, material: m } = o;
  const box = (
    p: [number, number, number],
    s: [number, number, number],
    c = m.color,
  ) => (
    <Box
      position={p}
      size={s}
      color={c}
      roughness={m.roughness}
      metalness={m.metalness}
    />
  );
  const legs = (top: number) =>
    [-1, 1].flatMap((x) =>
      [-1, 1].map((z) => (
        <Box
          key={`${x}${z}`}
          position={[x * w * 0.38, top / 2, z * d * 0.38]}
          size={[0.045, top, 0.045]}
          color="#554537"
        />
      )),
    );
  return (
    <group>
      {k === "sofa" || k === "chair" ? (
        <>
          {box([0, h * 0.36, 0], [w, d * 0.05 + h * 0.25, d])}
          {box([0, h * 0.72, -d * 0.4], [w, h * 0.56, d * 0.2])}
          {[-1, 1].map((x) => (
            <Box
              key={x}
              position={[x * (w / 2 - 0.09), h * 0.55, 0]}
              size={[0.18, h * 0.55, d]}
              color={m.color}
            />
          ))}
          {Array.from({ length: k === "sofa" ? 3 : 1 }, (_, i) => (
            <Box
              key={i}
              position={[
                (i - (k === "sofa" ? 1 : 0)) * w * 0.29,
                h * 0.55,
                0.04,
              ]}
              size={[k === "sofa" ? w * 0.28 : w * 0.68, 0.12, d * 0.68]}
              color={m.color}
            />
          ))}
          {legs(0.2)}
        </>
      ) : k === "table" || k === "desk" ? (
        <>
          {k === "table" ? (
            <mesh position={[0, h - 0.045, 0]} castShadow>
              <cylinderGeometry args={[w / 2, w / 2, 0.09, 48]} />
              <meshStandardMaterial {...m} />
            </mesh>
          ) : (
            box([0, h - 0.045, 0], [w, 0.09, d])
          )}
          {legs(h - 0.09)}
        </>
      ) : k === "bed" ? (
        <>
          {box([0, 0.2, 0], [w, 0.3, d])}
          {box([0, 0.43, 0], [w * 0.96, 0.2, d * 0.95], "#eee9df")}
          {box([0, h / 2, -d * 0.46], [w, h, 0.15])}
          {box([0, 0.55, d * 0.2], [w * 0.97, 0.08, d * 0.5], m.color)}
          {[-1, 1].map((x) => (
            <Box
              key={x}
              position={[x * w * 0.24, 0.57, -d * 0.28]}
              size={[w * 0.4, 0.13, d * 0.22]}
              color="#fffaf1"
            />
          ))}
        </>
      ) : k === "rug" ? (
        box([0, 0.02, 0], [w, 0.035, d])
      ) : k === "plant" ? (
        <>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[w * 0.25, w * 0.18, 0.4, 24]} />
            <meshStandardMaterial color="#b8a18c" />
          </mesh>
          {box([0, h * 0.45, 0], [0.035, h * 0.65, 0.035], "#69583e")}
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                Math.sin(i * 2) * w * 0.2,
                h * (0.5 + i * 0.085),
                Math.cos(i * 2) * d * 0.2,
              ]}
              castShadow
            >
              <sphereGeometry args={[w * 0.3, 12, 12]} />
              <meshStandardMaterial color={m.color} />
            </mesh>
          ))}
        </>
      ) : k === "lamp" ? (
        <>
          {box([0, h / 2, 0], [0.025, h, 0.025])}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[w * 0.4, w * 0.4, 0.06, 24]} />
            <meshStandardMaterial color={m.color} />
          </mesh>
          <mesh position={[0, h * 0.85, 0]} castShadow>
            <coneGeometry args={[w * 0.5, h * 0.25, 32, 1, true]} />
            <meshStandardMaterial color="#efe1c7" side={THREE.DoubleSide} />
          </mesh>
          <pointLight
            position={[0, h * 0.8, 0]}
            intensity={3}
            distance={4}
            color="#ffdaa2"
          />
        </>
      ) : k === "shelf" ? (
        <>
          {[-1, 1].map((x) => (
            <Box
              key={x}
              position={[x * (w / 2 - 0.03), h / 2, 0]}
              size={[0.06, h, d]}
              color={m.color}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <Box
              key={i}
              position={[0, (i * h) / 4 + 0.03, 0]}
              size={[w, 0.06, d]}
              color={m.color}
            />
          ))}
        </>
      ) : k === "bathtub" || k === "sink" ? (
        <>
          {box([0, h * 0.3, 0], [w, h * 0.6, d])}
          {[-1, 1].map((x) => (
            <Box
              key={x}
              position={[x * (w / 2 - 0.05), h * 0.8, 0]}
              size={[0.1, h * 0.4, d]}
              color={m.color}
            />
          ))}
          {[-1, 1].map((z) => (
            <Box
              key={z}
              position={[0, h * 0.8, z * (d / 2 - 0.05)]}
              size={[w, 0.4 * h, 0.1]}
              color={m.color}
            />
          ))}
        </>
      ) : k === "toilet" ? (
        <>
          {box([0, h * 0.6, -d * 0.35], [w, h * 0.8, d * 0.25])}
          <mesh position={[0, h * 0.4, 0.05]} scale={[w, 0.2, d * 0.7]}>
            <sphereGeometry args={[0.5, 24, 16]} />
            <meshStandardMaterial color={m.color} />
          </mesh>
          {box([0, h * 0.2, 0.05], [w * 0.55, h * 0.4, d * 0.4])}
        </>
      ) : (
        <>
          {box([0, h / 2, 0], [w, h, d])}
          {k !== "painting" && (
            <>
              {box(
                [0, h / 2, d / 2 + 0.01],
                [0.015, h * 0.95, 0.015],
                "#73695e",
              )}
              {box(
                [w * 0.08, h * 0.55, d / 2 + 0.035],
                [0.025, 0.18, 0.04],
                "#554b42",
              )}
            </>
          )}
        </>
      )}
    </group>
  );
}
function SceneContent({
  p,
  preset,
  walk,
  quality,
  ceiling,
  readOnly,
}: {
  p: Project;
  preset: string;
  walk: boolean;
  quality: string;
  ceiling: boolean;
  readOnly: boolean;
}) {
  const { camera, gl, scene } = useThree();
  const keys = useRef(new Set<string>());
  const selected = useEditor((s) => s.selected);
  const select = useEditor((s) => s.select);
  const shapes = useMemo(
    () =>
      p.rooms.map((r) => {
        const s = new THREE.Shape();
        r.points.forEach((q, i) =>
          i ? s.lineTo(q.x, -q.z) : s.moveTo(q.x, -q.z),
        );
        s.closePath();
        return s;
      }),
    [p.rooms],
  );
  useEffect(() => {
    const positions: Record<string, number[]> = {
      Isometric: [11, 9, 12],
      Top: [3.5, 13, 2.5],
      Front: [3.5, 4, 13],
      Back: [3.5, 4, -9],
      Left: [-9, 4, 2.5],
      Right: [15, 4, 2.5],
    };
    camera.position.fromArray(
      walk
        ? [3.5, p.camera.eyeHeight, 4]
        : positions[preset] || positions.Isometric,
    );
    camera.lookAt(3.5, 0, 2.5);
  }, [camera, preset, walk, p.camera.eyeHeight]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.code),
      up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const exp = async (e: Event) => {
      try {
        const format = (e as CustomEvent).detail;
        if (format === "glb") {
          const exportedScene = new THREE.Scene();
          scene.children
            .filter((o) => o.userData.design)
            .forEach((o) => exportedScene.add(o.clone(true)));
          exportedScene.traverse((o) => {
            if (o.userData.wall) o.scale.y = 1;
          });
          const result = await new GLTFExporter().parseAsync(exportedScene, {
            binary: true,
          });
          download(
            new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }),
            `${p.name}.glb`,
          );
        } else {
          gl.render(scene, camera);
          gl.domElement.toBlob(
            (b) => b && download(b, `${p.name}.${format}`),
            format === "jpg" ? "image/jpeg" : "image/png",
          );
        }
      } catch (error) {
        toast.error(`Export failed: ${(error as Error).message}`);
      }
    };
    window.addEventListener("scene-export", exp);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("scene-export", exp);
    };
  }, [camera, gl, p.name, scene]);
  useFrame((_, dt) => {
    if (!walk) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const side = new THREE.Vector3().crossVectors(
      dir,
      new THREE.Vector3(0, 1, 0),
    );
    const move = new THREE.Vector3();
    if (keys.current.has("KeyW")) move.add(dir);
    if (keys.current.has("KeyS")) move.sub(dir);
    if (keys.current.has("KeyD")) move.add(side);
    if (keys.current.has("KeyA")) move.sub(side);
    move.normalize().multiplyScalar(Math.min(dt, 0.05) * p.camera.speed);
    const nx = camera.position.x + move.x,
      nz = camera.position.z + move.z;
    const player = corners({
      x: nx,
      z: nz,
      width: 0.35,
      depth: 0.35,
      rotation: 0,
    });
    const blocked =
      p.furniture
        .filter((o) => o.kind !== "rug")
        .some((o) => overlap(player, corners(o))) ||
      p.walls.some((w) => {
        const dx = w.b.x - w.a.x,
          dz = w.b.z - w.a.z,
          t = Math.max(
            0,
            Math.min(
              1,
              ((nx - w.a.x) * dx + (nz - w.a.z) * dz) / (dx * dx + dz * dz),
            ),
          );
        return (
          Math.hypot(nx - w.a.x - t * dx, nz - w.a.z - t * dz) <
            0.2 + w.thickness / 2 &&
          !p.openings.some(
            (o) =>
              o.wallId === w.id &&
              o.kind === "door" &&
              Math.abs(t - o.offset) * Math.hypot(dx, dz) < o.width / 2 - 0.18,
          )
        );
      });
    if (!blocked) camera.position.add(move);
  });
  return (
    <>
      <color
        attach="background"
        args={[p.lighting.night ? "#242b32" : "#e9e7e1"]}
      />
      <ambientLight intensity={p.lighting.night ? 0.15 : 0.5} />
      <hemisphereLight args={["#fff5df", "#b0b6ac", 0.6]} />
      <directionalLight
        position={[
          Math.cos((p.lighting.sun * Math.PI) / 180) * 8,
          10,
          Math.sin((p.lighting.sun * Math.PI) / 180) * 8,
        ]}
        intensity={p.lighting.night ? 0.15 : 2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {p.rooms.map(
        (r, i) =>
          r.visible && (
            <group key={r.id} userData={{ design: true }}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
                onClick={(e) => {
                  e.stopPropagation();
                  select(r.id);
                }}
              >
                <shapeGeometry args={[shapes[i]]} />
                <FloorMaterial material={r.material} />
              </mesh>
              {ceiling && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.7, 0]}>
                  <shapeGeometry args={[shapes[i]]} />
                  <meshStandardMaterial
                    color="#eee9df"
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}
            </group>
          ),
      )}
      {visibleDesign(p).walls.map((w) => {
        const len = Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z),
          openings = p.openings
            .filter((o) => o.wallId === w.id)
            .sort((a, b) => a.offset - b.offset);
        let cursor = 0;
        const parts: { x: number; y: number; width: number; height: number }[] =
          [];
        openings.forEach((o) => {
          const start = Math.max(cursor, o.offset * len - o.width / 2),
            end = Math.min(len, o.offset * len + o.width / 2);
          if (start > cursor)
            parts.push({
              x: (cursor + start) / 2,
              y: w.height / 2,
              width: start - cursor,
              height: w.height,
            });
          if (o.sill > 0)
            parts.push({
              x: (start + end) / 2,
              y: o.sill / 2,
              width: end - start,
              height: o.sill,
            });
          const top = Math.min(w.height, o.sill + o.height);
          if (top < w.height)
            parts.push({
              x: (start + end) / 2,
              y: (top + w.height) / 2,
              width: end - start,
              height: w.height - top,
            });
          cursor = end;
        });
        if (cursor < len)
          parts.push({
            x: (cursor + len) / 2,
            y: w.height / 2,
            width: len - cursor,
            height: w.height,
          });
        return (
          <group
            key={w.id}
            userData={{ wall: true, design: true }}
            scale={[
              1,
              !walk &&
              !ceiling &&
              preset === "Isometric" &&
              ((w.a.x + w.b.x) / 2 >=
                Math.max(...p.walls.flatMap((w) => [w.a.x, w.b.x])) - 0.01 ||
                (w.a.z + w.b.z) / 2 >=
                  Math.max(...p.walls.flatMap((w) => [w.a.z, w.b.z])) - 0.01)
                ? 0.08
                : 1,
              1,
            ]}
            position={[w.a.x, 0, w.a.z]}
            rotation={[0, -Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x), 0]}
            onClick={(e) => {
              e.stopPropagation();
              select(w.id);
            }}
          >
            {parts.map((a, i) => (
              <Box
                key={i}
                position={[a.x, a.y, 0]}
                size={[a.width, a.height, w.thickness]}
                color={selected.includes(w.id) ? "#a6b99e" : w.material.color}
              />
            ))}
            {openings
              .filter((o) => o.kind === "window")
              .map((o) => (
                <mesh
                  key={o.id}
                  position={[o.offset * len, o.sill + o.height / 2, 0]}
                >
                  <boxGeometry args={[o.width, o.height, 0.025]} />
                  <meshPhysicalMaterial
                    color="#bddae0"
                    transparent
                    opacity={0.22}
                    roughness={0.1}
                  />
                </mesh>
              ))}
          </group>
        );
      })}
      {visibleDesign(p).furniture.map((o) => (
        <EditableFurniture key={o.id} o={o} walk={walk} readOnly={readOnly} />
      ))}
      {quality === "High" && (
        <ContactShadows
          position={[3.5, -0.025, 2.5]}
          opacity={0.35}
          scale={22}
          blur={2}
          far={5}
          resolution={512}
        />
      )}
      {useEditor.getState().grid && (
        <Grid
          position={[3.5, -0.04, 2.5]}
          args={[30, 30]}
          cellSize={useEditor.getState().gridStep}
          sectionSize={1}
          cellColor="#d0cec7"
          sectionColor="#b9b7af"
          fadeDistance={35}
        />
      )}
      {walk ? (
        <PointerLockControls />
      ) : (
        <OrbitControls
          makeDefault
          target={[3.5, 0, 2.5]}
          maxPolarAngle={Math.PI / 2 - 0.03}
          minDistance={2}
          maxDistance={45}
        />
      )}
    </>
  );
}
export default function Scene({
  preset,
  walk,
  quality,
  ceiling,
  readOnly = false,
}: {
  preset: string;
  walk: boolean;
  quality: string;
  ceiling: boolean;
  readOnly?: boolean;
}) {
  const p = useEditor((s) => s.project)!;
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="empty">
        WebGL is unavailable. Switch to 2D to continue editing.
      </div>
    );
  return (
    <RenderBoundary
      fallback={
        <div className="empty">
          3D rendering is unavailable. Switch to 2D to continue editing.
        </div>
      }
    >
      <Canvas
        shadows={quality !== "Low"}
        dpr={quality === "High" ? [1, 2] : 1}
        camera={{ position: [11, 9, 12], fov: 42 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () =>
            setFailed(true),
          );
        }}
        onPointerMissed={() => useEditor.getState().select("")}
      >
        <SceneContent
          p={p}
          preset={preset}
          walk={walk}
          quality={quality}
          ceiling={ceiling}
          readOnly={readOnly}
        />
      </Canvas>
    </RenderBoundary>
  );
}
