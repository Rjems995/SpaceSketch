"use client";
import type { Project } from "@/lib/model";
import { moveRoomCorner } from "@/lib/rooms";
import { useEditor } from "@/stores/editor";
export default function RoomCorners({
  room,
}: {
  room: Project["rooms"][number];
}) {
  const s = useEditor();
  return (
    <details className="corner-editor" open>
      <summary>Edit room corners</summary>
      <p>
        Drag the numbered blue handles in 2D, or enter coordinates. Connected
        walls follow. Crossing boundaries are rejected.
      </p>
      <button
        className="secondary"
        onClick={() => useEditor.setState({ view: "2d", tool: "select" })}
      >
        Show corner handles
      </button>
      {room.points.map((point, i) => (
        <div className="dimension-grid" key={i}>
          {(["x", "z"] as const).map((axis) => (
            <label key={axis}>
              Corner {i + 1} {axis} (m)
              <input
                type="number"
                aria-label={`Corner ${i + 1} ${axis}`}
                min={-100}
                max={100}
                step={0.1}
                value={point[axis]}
                onChange={(e) => {
                  if (e.target.value !== "")
                    s.edit((p) =>
                      moveRoomCorner(p, room.id, i, {
                        ...point,
                        [axis]: Number(e.target.value),
                      }),
                    );
                }}
              />
            </label>
          ))}
        </div>
      ))}
    </details>
  );
}
