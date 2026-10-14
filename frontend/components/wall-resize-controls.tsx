"use client";
import { useRef, useState } from "react";
import { ArrowLeftRight, ArrowUpDown } from "lucide-react";
import type { Wall } from "@/lib/model";
import { distance } from "@/lib/geometry";
import { moveWallEndpoint } from "@/lib/rooms";
import { useEditor } from "@/stores/editor";

export default function WallResizeControls({ wall }: { wall: Wall }) {
  const [preview, setPreview] = useState<{ axis: "length" | "height"; value: number } | null>(null);
  const drag = useRef<{ axis: "length" | "height"; x: number; y: number; initial: number; value: number } | null>(null);
  const length = distance(wall.a, wall.b);
  function commit(axis: "length" | "height", value: number) {
    useEditor.getState().edit(p => {
      const current = p.walls.find(w => w.id === wall.id);
      if (!current) return;
      if (axis === "height") current.height = value;
      else {
        const scale = value / distance(current.a, current.b);
        moveWallEndpoint(p, wall.id, "b", { x: current.a.x + (current.b.x - current.a.x) * scale, z: current.a.z + (current.b.z - current.a.z) * scale });
      }
    });
  }
  return <div className="wall-resize-controls" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
    <span>Resize wall · drag arrows</span>
    <div>
      {(["length", "height"] as const).map(axis => {
        const value = axis === "length" ? length : wall.height;
        const clamp = (n: number) => Math.max(axis === "height" ? 0.5 : 0.2, Math.min(axis === "height" ? 6 : 100, Math.round(n * 10) / 10));
        return <button key={axis} type="button" aria-label={`Drag wall ${axis}`} title={`Drag ${axis === "height" ? "up/down" : "left/right"} to resize; arrow keys adjust by 0.1 m`}
          style={{ cursor: axis === "height" ? "ns-resize" : "ew-resize" }}
          onPointerDown={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { axis, x: e.clientX, y: e.clientY, initial: value, value }; }}
          onPointerMove={e => { const d = drag.current; if (!d || d.axis !== axis) return; d.value = clamp(d.initial + (axis === "height" ? d.y - e.clientY : e.clientX - d.x) / 80); setPreview({ axis, value: d.value }); }}
          onPointerUp={e => { const d = drag.current; drag.current = null; setPreview(null); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); if (d && d.value !== d.initial) commit(axis, d.value); }}
          onPointerCancel={() => { drag.current = null; setPreview(null); }}
          onLostPointerCapture={() => { drag.current = null; setPreview(null); }}
          onKeyDown={e => { if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); commit(axis, clamp(value + (["ArrowUp", "ArrowRight"].includes(e.key) ? 0.1 : -0.1))); } }}>
          {axis === "height" ? <ArrowUpDown size={22} /> : <ArrowLeftRight size={22} />}
          <span>{axis}<strong>{(preview?.axis === axis ? preview.value : value).toFixed(1)} m</strong></span>
        </button>;
      })}
    </div>
    <small>Release to apply · Undo to restore</small>
  </div>;
}
