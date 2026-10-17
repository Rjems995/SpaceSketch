"use client";
import { useEffect, useRef } from "react";
import { ArrowLeftRight, ArrowUpDown } from "lucide-react";
import type { Wall } from "@/lib/model";
import { distance } from "@/lib/geometry";
import { moveWallEndpoint } from "@/lib/rooms";
import { useEditor } from "@/stores/editor";
export type HandlePoint = { x: number; y: number; dx: number; dy: number };
export type WallHandlePositions = Record<"a" | "b" | "height", HandlePoint>;
export default function WallResizeControls({
  wall,
  positions,
}: {
  wall: Wall;
  positions: WallHandlePositions;
}) {
  const drag = useRef<{
    axis: "a" | "b" | "height";
    x: number;
    y: number;
    wall: Wall;
    vector: HandlePoint;
  } | null>(null);
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drag.current) {
        drag.current = null;
        useEditor.getState().finishPreview(false);
      }
    };
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("keydown", cancel);
      if (drag.current) useEditor.getState().finishPreview(false);
    };
  }, []);
  function resize(
    base: Wall,
    axis: "a" | "b" | "height",
    delta: number,
    preview: boolean,
  ) {
    const s = useEditor.getState();
    const step = s.snapping ? s.gridStep : 0.01;
    const round = (n: number) => Math.round(n / step) * step;
    const fn = (p: NonNullable<typeof s.project>) => {
      const current = p.walls.find((w) => w.id === base.id);
      if (!current) return;
      if (axis === "height")
        current.height = Math.max(0.5, Math.min(6, round(base.height + delta)));
      else {
        const other = axis === "a" ? "b" : "a";
        const len = distance(base.a, base.b);
        const next = Math.max(0.2, round(len + delta));
        moveWallEndpoint(p, base.id, axis, {
          x: base[other].x + ((base[axis].x - base[other].x) * next) / len,
          z: base[other].z + ((base[axis].z - base[other].z) * next) / len,
        });
      }
    };
    if (preview) s.preview(fn);
    else s.edit(fn);
  }
  return (
    <div className="wall-handles">
      {(["a", "b", "height"] as const).map((axis) => {
        const pos = positions[axis];
        return (
          <button
            key={axis}
            className={`wall-handle wall-handle-${axis}`}
            type="button"
            style={{
              left: pos.x,
              top: pos.y,
              cursor: axis === "height" ? "ns-resize" : "ew-resize",
            }}
            aria-label={
              axis === "height"
                ? "Drag wall height"
                : axis === "a"
                  ? "Drag wall start"
                  : "Drag wall length"
            }
            title="Drag to resize live. Arrow keys adjust; Escape cancels."
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                axis,
                x: e.clientX,
                y: e.clientY,
                wall: structuredClone(wall),
                vector: { ...pos },
              };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.axis !== axis) return;
              const { dx, dy } = d.vector;
              resize(
                d.wall,
                axis,
                ((e.clientX - d.x) * dx + (e.clientY - d.y) * dy) /
                  Math.max(100, dx * dx + dy * dy),
                true,
              );
            }}
            onPointerUp={(e) => {
              if (!drag.current) return;
              drag.current = null;
              useEditor.getState().finishPreview(true);
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              drag.current = null;
              useEditor.getState().finishPreview(false);
            }}
            onLostPointerCapture={() => {
              if (drag.current) {
                drag.current = null;
                useEditor.getState().finishPreview(false);
              }
            }}
            onKeyDown={(e) => {
              if (
                ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                e.stopPropagation();
                resize(
                  wall,
                  axis,
                  ["ArrowUp", "ArrowRight"].includes(e.key) ? 0.1 : -0.1,
                  false,
                );
              }
            }}
          >
            {axis === "height" ? (
              <ArrowUpDown size={22} />
            ) : (
              <ArrowLeftRight
                size={22}
                style={{
                  transform: `rotate(${(Math.atan2(pos.dy, pos.dx) * 180) / Math.PI}deg)`,
                }}
              />
            )}
            <span>
              {axis === "height" ? "Height" : axis === "a" ? "Start" : "Length"}
              <strong>
                {(axis === "height"
                  ? wall.height
                  : distance(wall.a, wall.b)
                ).toFixed(2)}{" "}
                m
              </strong>
            </span>
          </button>
        );
      })}
    </div>
  );
}
