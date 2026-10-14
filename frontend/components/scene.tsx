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
import { Box, FurnitureModel } from "./furniture-model";
import RenderBoundary from "./render-boundary";
import WallResizeControls, { WallHandlePositions } from "./wall-resize-controls";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { Furniture, Project, Wall } from "@/lib/model";
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
              !selected.includes(w.id) &&
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
              if (readOnly || walk) return;
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
function ProjectWallHandles({ wall, onChange }: { wall: Wall; onChange: (p: WallHandlePositions) => void }) {
  const last = useRef("");
  useFrame(({ camera, size }) => {
    const project = (x: number, y: number, z: number) => {
      const v = new THREE.Vector3(x, y, z).project(camera);
      return { x: Math.round((v.x + 1) * size.width / 2), y: Math.round((1 - v.y) * size.height / 2) };
    };
    const len = Math.hypot(wall.b.x - wall.a.x, wall.b.z - wall.a.z);
    const dx = (wall.b.x - wall.a.x) / len, dz = (wall.b.z - wall.a.z) / len;
    const a = project(wall.a.x, wall.height / 2, wall.a.z);
    const b = project(wall.b.x, wall.height / 2, wall.b.z);
    const h = project((wall.a.x + wall.b.x) / 2, wall.height, (wall.a.z + wall.b.z) / 2);
    const va = project(wall.a.x - dx, wall.height / 2, wall.a.z - dz);
    const vb = project(wall.b.x + dx, wall.height / 2, wall.b.z + dz);
    const vh = project((wall.a.x + wall.b.x) / 2, wall.height + 1, (wall.a.z + wall.b.z) / 2);
    const next = { a: { ...a, dx: va.x - a.x, dy: va.y - a.y }, b: { ...b, dx: vb.x - b.x, dy: vb.y - b.y }, height: { ...h, dx: vh.x - h.x, dy: vh.y - h.y } };
    const serialized = JSON.stringify(next);
    if (serialized !== last.current) { last.current = serialized; onChange(next); }
  });
  return null;
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
  const p = useEditor((s) => s.previewProject ?? s.project)!;
  const selected = useEditor(s => s.selected);
  const [handlePositions, setHandlePositions] = useState<WallHandlePositions | null>(null);
  const selectedWall = !readOnly && !walk ? visibleDesign(p).walls.find(w => selected.includes(w.id)) : undefined;
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
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
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
        {selectedWall && <ProjectWallHandles wall={selectedWall} onChange={setHandlePositions} />}
        <SceneContent
          p={p}
          preset={preset}
          walk={walk}
          quality={quality}
          ceiling={ceiling}
          readOnly={readOnly}
        />
      </Canvas>
      {selectedWall && handlePositions && <WallResizeControls key={selectedWall.id} wall={selectedWall} positions={handlePositions} />}
      </div>
    </RenderBoundary>
  );
}
