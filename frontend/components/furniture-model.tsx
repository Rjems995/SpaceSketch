"use client";
import DesignMaterial from "./design-material";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { Furniture } from "@/lib/model";
function SoftBox({
  position,
  size,
  color,
  material,
  roughness = 0.7,
  metalness = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  material?: Furniture["material"];
  roughness?: number;
  metalness?: number;
}) {
  return (
    <RoundedBox
      position={position}
      args={size}
      radius={Math.min(0.045, ...size.map((n) => n * 0.15))}
      smoothness={2}
      castShadow
      receiveShadow
    >
      {material ? (
        <DesignMaterial material={material} color={color} />
      ) : (
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={metalness}
        />
      )}
    </RoundedBox>
  );
}
export function FurnitureModel({ o }: { o: Furniture }) {
  const { width: w, depth: d, height: h, kind: k, material: m } = o;
  const box = (
    p: [number, number, number],
    s: [number, number, number],
    c = m.color,
  ) => (
    <SoftBox
      position={p}
      size={s}
      color={c}
      material={c === m.color ? m : undefined}
      roughness={m.roughness}
      metalness={m.metalness}
    />
  );
  const legs = (top: number) =>
    [-1, 1].flatMap((x) =>
      [-1, 1].map((z) => (
        <SoftBox
          key={`${x}${z}`}
          position={[x * w * 0.38, top / 2, z * d * 0.38]}
          size={[0.045, top, 0.045]}
          color="#554537"
        />
      )),
    );
  return (
    <group>
      {k === "stairs" ? (
        <group>
          {Array.from({ length: 16 }, (_, i) => (
            <group key={i}>
              {box(
                [0, (h * (i + 1)) / 32, d / 2 - (d * (i + 0.5)) / 16],
                [w, (h * (i + 1)) / 16, d / 16 + 0.005],
              )}
            </group>
          ))}
        </group>
      ) : k === "umbrella" ? (
        <>
          {box([0, h * 0.45, 0], [0.06, h * 0.9, 0.06], "#73614c")}
          {box([0, 0.04, 0], [w * 0.22, 0.08, d * 0.22], "#555653")}
          <mesh position={[0, h * 0.9, 0]} scale={[1, 1, d / w]} castShadow>
            <coneGeometry args={[w / 2, h * 0.2, 8]} />
            <meshStandardMaterial color={m.color} side={THREE.DoubleSide} />
          </mesh>
        </>
      ) : k === "pergola" ? (
        <>
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <SoftBox
                key={`${x}${z}`}
                position={[x * (w / 2 - 0.07), h / 2, z * (d / 2 - 0.07)]}
                size={[0.14, h, 0.14]}
                color={m.color}
              />
            )),
          )}
          {[-1, 1].map((z) => (
            <SoftBox
              key={z}
              position={[0, h - 0.15, z * (d / 2 - 0.07)]}
              size={[w, 0.18, 0.14]}
              color={m.color}
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <SoftBox
              key={i}
              position={[(i / 7 - 0.5) * (w - 0.12), h - 0.05, 0]}
              size={[0.12, 0.1, d]}
              color={m.color}
            />
          ))}
        </>
      ) : k === "fence" ? (
        <>
          {[0.3, 0.7].map((y) => (
            <SoftBox
              key={y}
              position={[0, h * y, 0]}
              size={[w, h * 0.1, d * 0.6]}
              color={m.color}
            />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <SoftBox
              key={i}
              position={[(i / 10 - 0.5) * (w - w / 16), h / 2, 0]}
              size={[w / 16, h, d]}
              color={m.color}
            />
          ))}
        </>
      ) : k === "hedge" || k === "planter" ? (
        <>
          {box(
            [0, h * 0.22, 0],
            [w, h * 0.44, d],
            k === "planter" ? "#947251" : "#67553b",
          )}
          {box([0, h * 0.7, 0], [w * 0.94, h * 0.6, d * 0.94])}
        </>
      ) : k === "grill" ? (
        <>
          {legs(h * 0.55)}
          {box([0, h * 0.65, 0], [w, h * 0.3, d])}
          {box([0, h * 0.9, 0], [w * 0.8, h * 0.2, d * 0.85])}
          {box([0, h * 0.85, d * 0.49], [w * 0.45, 0.035, 0.035], "#c4c4bd")}
        </>
      ) : k === "ottoman" ? (
        <>
          {legs(h * 0.2)}
          {box([0, h * 0.6, 0], [w, h * 0.8, d])}
        </>
      ) : k === "lounger" ? (
        <>
          {legs(h * 0.4)}
          {box([0, h * 0.45, d * 0.12], [w, h * 0.12, d * 0.72])}
          <group position={[0, h * 0.7, -d * 0.32]} rotation={[-0.65, 0, 0]}>
            {box([0, 0, 0], [w, h * 0.65, d * 0.08])}
          </group>
          {box(
            [0, h * 0.54, d * 0.12],
            [w * 0.94, h * 0.06, d * 0.69],
            "#f1e9d8",
          )}
        </>
      ) : k === "bench" ? (
        <>
          {legs(h * 0.4)}
          {[0, 1, 2, 3].map((i) => (
            <SoftBox
              key={i}
              position={[0, h * 0.45, (i / 3 - 0.5) * d * 0.85]}
              size={[w, h * 0.1, d * 0.2]}
              color={m.color}
            />
          ))}
          {[0, 1, 2].map((i) => (
            <SoftBox
              key={i}
              position={[0, h * (0.6 + i * 0.16), -d * 0.4]}
              size={[w, h * 0.12, d * 0.12]}
              color={m.color}
            />
          ))}
        </>
      ) : k === "sofa" || k === "chair" ? (
        <>
          {[-1, 1].map((x) => (
            <group
              key={x}
              position={[x * w * 0.3, h * 0.78, -d * 0.22]}
              rotation={[0.15, 0, x * 0.12]}
            >
              {box([0, 0, 0], [w * 0.2, h * 0.3, d * 0.13], "#e9dfcb")}
            </group>
          ))}
          {box([0, h * 0.36, 0], [w, d * 0.05 + h * 0.25, d])}
          {box([0, h * 0.72, -d * 0.4], [w, h * 0.56, d * 0.2])}
          {[-1, 1].map((x) => (
            <SoftBox
              key={x}
              position={[x * (w / 2 - 0.09), h * 0.55, 0]}
              size={[0.18, h * 0.55, d]}
              color={m.color}
            />
          ))}
          {Array.from({ length: k === "sofa" ? 3 : 1 }, (_, i) => (
            <SoftBox
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
      ) : k === "table" || k === "desk" || k === "dining" ? (
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
            <SoftBox
              key={x}
              position={[x * w * 0.24, 0.57, -d * 0.28]}
              size={[w * 0.4, 0.13, d * 0.22]}
              color="#fffaf1"
            />
          ))}
        </>
      ) : k === "rug" ? (
        box([0, 0.02, 0], [w, 0.035, d])
      ) : k === "plant" || k === "tree" ? (
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
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2, 3].map((i) => (
              <SoftBox
                key={`${row}-${i}`}
                position={[
                  -w * 0.28 + i * w * 0.13,
                  h * (0.12 + row * 0.25),
                  0,
                ]}
                size={[w * 0.09, h * 0.17, d * 0.65]}
                color={["#7d8b73", "#c6a57c", "#a06d55", "#ded5c3"][i]}
              />
            )),
          )}
          {[-1, 1].map((x) => (
            <SoftBox
              key={x}
              position={[x * (w / 2 - 0.03), h / 2, 0]}
              size={[0.06, h, d]}
              color={m.color}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <SoftBox
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
            <SoftBox
              key={x}
              position={[x * (w / 2 - 0.05), h * 0.8, 0]}
              size={[0.1, h * 0.4, d]}
              color={m.color}
            />
          ))}
          {[-1, 1].map((z) => (
            <SoftBox
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
      ) : k === "nightstand" || k === "cabinet" ? (
        <>
          {box([0, h * 0.52, 0], [w, h * 0.92, d])}
          {[0, 1].map((i) => (
            <group key={i}>
              {box(
                [0, h * (0.3 + i * 0.45), d * 0.51],
                [w * 0.9, h * 0.39, 0.025],
              )}
              {box(
                [0, h * (0.3 + i * 0.45), d * 0.55],
                [w * 0.25, 0.025, 0.025],
                "#493f35",
              )}
            </group>
          ))}
          {legs(h * 0.1)}
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

export function Box({
  position,
  size,
  color,
  material,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  material?: Furniture["material"];
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      {material ? (
        <DesignMaterial material={material} color={color} />
      ) : (
        <meshStandardMaterial color={color} roughness={0.7} />
      )}
    </mesh>
  );
}
