"use client";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { catalog, makeFurniture, type Furniture } from "@/lib/model";
import { FurnitureModel } from "./furniture-model";
import RenderBoundary from "./render-boundary";

export type PreviewImages = Partial<Record<Furniture["kind"], string>>;
const cache: PreviewImages = {};
function Capture({
  kind,
  onCapture,
}: {
  kind: Furniture["kind"];
  onCapture: (kind: Furniture["kind"], image: string) => void;
}) {
  const object = useMemo(() => makeFurniture(kind, 0, 0), [kind]);
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let frame = 0;
    // Wait for the model's geometry to be committed before taking the snapshot.
    const first = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const radius =
          Math.max(object.width, object.depth, object.height) * 1.55;
        camera.position.set(radius, radius * 0.85 + object.height / 2, radius);
        camera.lookAt(0, object.height / 2, 0);
        camera.updateProjectionMatrix();
        gl.render(scene, camera);
        onCapture(kind, gl.domElement.toDataURL("image/webp", 0.9));
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(frame);
    };
  }, [camera, gl, kind, object, onCapture, scene]);
  return (
    <>
      <color attach="background" args={["#f5f3ec"]} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 7, 5]} intensity={3} />
      <directionalLight
        position={[-4, 3, -2]}
        intensity={1.5}
        color="#dbe5f2"
      />
      <FurnitureModel o={object} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <circleGeometry
          args={[Math.max(object.width, object.depth) * 0.6, 48]}
        />
        <meshBasicMaterial
          color="#d8d0c1"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
export default function FurniturePreviews({
  onReady,
}: {
  onReady: (images: PreviewImages) => void;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    onReady({ ...cache });
  }, [onReady]);
  const onCapture = useMemo(
    () => (kind: Furniture["kind"], image: string) => {
      cache[kind] = image;
      onReady({ ...cache });
      setIndex((i) => i + 1);
    },
    [onReady],
  );
  const pending = useMemo(() => catalog.filter((c) => !cache[c.kind]), []);
  if (index >= pending.length) return null;
  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -1024,
        top: 0,
        width: 256,
        height: 192,
        pointerEvents: "none",
      }}
    >
      <RenderBoundary fallback={null}>
        <Canvas
          frameloop="demand"
          dpr={1}
          camera={{ fov: 32 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <Capture kind={pending[index].kind} onCapture={onCapture} />
        </Canvas>
      </RenderBoundary>
    </div>,
    document.body,
  );
}
