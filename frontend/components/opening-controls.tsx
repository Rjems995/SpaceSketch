"use client";
import { useEffect, useRef } from "react";
import { ArrowLeftRight, ArrowUpDown, Move } from "lucide-react";
import type { Opening, Wall } from "@/lib/model";
import type { WallHandlePositions } from "./wall-resize-controls";
import { useEditor } from "@/stores/editor";
import { distance, snap } from "@/lib/geometry";
import { openingOffset, openingPosition } from "@/lib/placement";
export default function OpeningControls({
  opening,
  wall,
  positions,
}: {
  opening: Opening;
  wall: Wall;
  positions: WallHandlePositions;
}) {
  const drag = useRef<{
    axis: "a" | "b" | "height";
    x: number;
    y: number;
    original: Opening;
    dx: number;
    dy: number;
  } | null>(null);
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
  const apply = (
    original: Opening,
    axis: "a" | "b" | "height",
    delta: number,
    preview: boolean,
  ) => {
    const s = useEditor.getState(),
      len = distance(wall.a, wall.b);
    const fn = (p: NonNullable<typeof s.project>) => {
      const o = p.openings.find((o) => o.id === original.id)!;
      const round = (n: number) => (s.snapping ? snap(n, s.gridStep) : n);
      if (axis === "a") {
        const q = openingPosition(original, wall);
        o.offset = openingOffset(
          p,
          original,
          {
            x: q.x + (delta * (wall.b.x - wall.a.x)) / len,
            z: q.z + (delta * (wall.b.z - wall.a.z)) / len,
          },
          s.snapping,
          s.gridStep,
        );
      } else if (axis === "b")
        o.width = Math.max(0.3, Math.min(4, round(original.width + delta * 2)));
      else
        o.height = Math.max(0.3, Math.min(3, round(original.height + delta)));
    };
    if (preview) s.preview(fn);
    else s.edit(fn);
  };
  return (
    <div className="wall-handles opening-handles">
      {(["a", "b", "height"] as const).map((axis) => {
        const pos = positions[axis],
          label =
            axis === "a"
              ? "Move opening"
              : axis === "b"
                ? "Resize opening width"
                : "Resize opening height";
        return (
          <button
            key={axis}
            type="button"
            className="wall-handle"
            style={{ left: pos.x, top: pos.y }}
            aria-label={label}
            title={`${label}. Drag or use arrow keys; Escape cancels.`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = {
                axis,
                x: e.clientX,
                y: e.clientY,
                original: { ...opening },
                dx: pos.dx,
                dy: pos.dy,
              };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              apply(
                d.original,
                d.axis,
                ((e.clientX - d.x) * d.dx + (e.clientY - d.y) * d.dy) /
                  Math.max(100, d.dx ** 2 + d.dy ** 2),
                true,
              );
            }}
            onPointerUp={(e) => {
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
                ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                e.stopPropagation();
                apply(
                  opening,
                  axis,
                  ["ArrowLeft", "ArrowDown"].includes(e.key) ? -0.1 : 0.1,
                  false,
                );
              }
            }}
          >
            {axis === "a" ? (
              <Move size={20} />
            ) : axis === "b" ? (
              <ArrowLeftRight size={20} />
            ) : (
              <ArrowUpDown size={20} />
            )}
            <span>
              {axis === "a" ? "Move" : axis === "b" ? "Width" : "Height"}
              <strong>
                {(axis === "a"
                  ? opening.offset * distance(wall.a, wall.b)
                  : axis === "b"
                    ? opening.width
                    : opening.height
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
