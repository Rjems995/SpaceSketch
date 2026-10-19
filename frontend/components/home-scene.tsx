"use client";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useState } from "react";

function Block({
  position,
  size,
  color = "#ede3cf",
  radius = 0.03,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  radius?: number;
}) {
  return (
    <RoundedBox
      position={position}
      args={size}
      radius={radius}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.82} />
    </RoundedBox>
  );
}
function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.1, 1.8, 7]} />
        <meshStandardMaterial color="#766149" />
      </mesh>
      {[
        [-0.25, 1.8, 0, 0.55],
        [0.22, 2.1, 0.08, 0.62],
        [0, 2.55, 0, 0.44],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 2]} />
          <meshStandardMaterial
            color={["#637457", "#7c8b65", "#9ca579"][i]}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}
function House() {
  return (
    <group position={[1, -0.25, 0]} rotation={[0, -0.2, 0]}>
      <Block
        position={[0, -0.24, 0]}
        size={[10, 0.46, 8]}
        color="#8b967a"
        radius={0.18}
      />
      <Block
        position={[0.3, 0.04, 0.2]}
        size={[7.7, 0.15, 5.9]}
        color="#d0bea2"
      />
      <Block position={[0.1, 0.18, -0.3]} size={[5.8, 0.22, 4.4]} />
      {/* Rear and side walls leave the front open like an architectural model. */}
      <Block position={[0.1, 1.5, -2.4]} size={[5.8, 2.5, 0.18]} />
      <Block position={[-2.7, 1.5, -0.3]} size={[0.18, 2.5, 4.3]} />
      <Block position={[2.9, 1.5, -1.5]} size={[0.18, 2.5, 1.9]} />
      <Block
        position={[0.35, 1.5, -1.55]}
        size={[0.16, 2.5, 1.6]}
        color="#b9906a"
      />
      {/* Warm timber slats and a floating roof over the rear wing. */}
      {Array.from({ length: 17 }, (_, i) => (
        <Block
          key={i}
          position={[-2.5 + i * 0.31, 1.5, -2.27]}
          size={[0.045, 2.4, 0.04]}
          color="#bba17e"
        />
      ))}
      <Block
        position={[0.1, 2.82, -1.7]}
        size={[6.2, 0.18, 1.8]}
        color="#e9dfcb"
      />
      <Block
        position={[2.2, 2.82, 0.3]}
        size={[1.9, 0.18, 2.2]}
        color="#e9dfcb"
      />
      <Block
        position={[2.95, 1.5, 1.3]}
        size={[0.12, 2.5, 0.12]}
        color="#414a3e"
      />
      {/* Glazed side of the house. */}
      {[0.1, 0.9].map((z) => (
        <group key={z}>
          <mesh position={[-2.59, 1.5, z]}>
            <boxGeometry args={[0.025, 2.3, 0.75]} />
            <meshPhysicalMaterial
              color="#b3d0c3"
              transparent
              opacity={0.3}
              roughness={0.12}
            />
          </mesh>
          <Block
            position={[-2.56, 1.5, z + 0.38]}
            size={[0.06, 2.4, 0.045]}
            color="#3a453b"
          />
        </group>
      ))}
      {/* Living room: rug, sofa, cushions, stone coffee table. */}
      <Block
        position={[-1.1, 0.32, 0.1]}
        size={[2.6, 0.03, 2.1]}
        color="#c3b296"
      />
      <Block
        position={[-1.3, 0.63, -0.7]}
        size={[2.1, 0.6, 0.85]}
        color="#f3ede0"
        radius={0.13}
      />
      <Block
        position={[-1.3, 0.97, -1.02]}
        size={[2.1, 0.5, 0.23]}
        color="#e8dfcc"
        radius={0.08}
      />
      {[-2.2, -0.4].map((x) => (
        <Block
          key={x}
          position={[x, 0.85, -0.7]}
          size={[0.22, 0.45, 0.9]}
          color="#e8dfcc"
          radius={0.08}
        />
      ))}
      <Block
        position={[-1.8, 0.98, -0.78]}
        size={[0.42, 0.42, 0.16]}
        color="#b87e5c"
        radius={0.08}
      />
      <Block
        position={[-1.22, 0.98, -0.78]}
        size={[0.42, 0.42, 0.16]}
        color="#8a987c"
        radius={0.08}
      />
      <mesh position={[-1.15, 0.59, 0.5]} castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.13, 40]} />
        <meshStandardMaterial color="#9a7252" />
      </mesh>
      <Block
        position={[-1.15, 0.44, 0.5]}
        size={[0.45, 0.3, 0.45]}
        color="#76644e"
      />
      {/* Dining and kitchen wing. */}
      <Block
        position={[1.65, 0.77, -1.9]}
        size={[2.1, 1, 0.55]}
        color="#a08665"
      />
      <Block
        position={[1.65, 1.3, -1.9]}
        size={[2.2, 0.09, 0.65]}
        color="#efe8d8"
      />
      <Block
        position={[1.65, 0.92, -0.3]}
        size={[1.5, 0.13, 1]}
        color="#ae805c"
      />
      {[1.15, 2.15].map((x) =>
        [-0.95, 0.35].map((z) => (
          <group key={x + ":" + z}>
            <Block
              position={[x, 0.57, z]}
              size={[0.45, 0.13, 0.45]}
              color="#717f60"
            />
            <Block
              position={[x, 0.82, z + (z < 0 ? -0.2 : 0.2)]}
              size={[0.45, 0.5, 0.09]}
              color="#717f60"
            />
            <Block
              position={[x, 0.4, z]}
              size={[0.12, 0.4, 0.12]}
              color="#6f624c"
            />
          </group>
        )),
      )}
      <mesh position={[1.65, 2.15, -0.3]}>
        <coneGeometry args={[0.45, 0.35, 32, 1, true]} />
        <meshStandardMaterial color="#ac784b" side={2} />
      </mesh>
      <pointLight
        position={[1.65, 1.9, -0.3]}
        color="#ffd6a0"
        intensity={3}
        distance={5}
      />
      {/* Patio, steps, pool and stepping stones. */}
      {[0, 1, 2].map((i) => (
        <Block
          key={i}
          position={[0.1, 0.15 - i * 0.08, 2 + i * 0.24]}
          size={[2, 0.12, 0.5]}
          color="#e4d7be"
        />
      ))}
      <Block
        position={[3.7, 0.06, 1.2]}
        size={[1.6, 0.15, 3.5]}
        color="#e6dcc8"
      />
      <Block
        position={[3.7, 0.15, 1.2]}
        size={[1.25, 0.04, 3.15]}
        color="#759e97"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <Block
          key={i}
          position={[-3.6, 0.03, -1.4 + i * 0.85]}
          size={[0.65, 0.08, 0.5]}
          color="#d6c7ac"
        />
      ))}
      {[
        [-4, -2.7, 1.3],
        [-3.7, 2.8, 0.9],
        [4, -2.8, 1.1],
        [1, -3.3, 0.85],
        [-1.5, -3.25, 1],
      ].map(([x, z, s], i) => (
        <Tree key={i} x={x} z={z} scale={s} />
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-4.3 + i * 0.7, 0.16, -3.6]} castShadow>
          <icosahedronGeometry args={[0.23 + (i % 3) * 0.08, 1]} />
          <meshStandardMaterial color={i % 2 ? "#899577" : "#657455"} />
        </mesh>
      ))}
      <Tree x={2.4} z={2.8} scale={0.55} />
    </group>
  );
}
export default function HomeScene() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduce(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [11, 9, 12], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="Interactive 3D architectural model of a furnished home and garden"
    >
      <ambientLight intensity={1.5} color="#f5ecda" />
      <directionalLight
        position={[-6, 12, 5]}
        intensity={3.5}
        color="#fff0d5"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[7, 5, -8]} intensity={1.5} color="#c1d0b7" />
      <House />
      <ContactShadows
        position={[1, -0.52, 0]}
        opacity={0.45}
        scale={25}
        blur={2.5}
        far={8}
        resolution={256}
        frames={1}
      />
      <OrbitControls
        target={[0.7, 0.8, 0]}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={0.65}
        maxPolarAngle={1.15}
        autoRotate={!reduce}
        autoRotateSpeed={0.25}
      />
    </Canvas>
  );
}
