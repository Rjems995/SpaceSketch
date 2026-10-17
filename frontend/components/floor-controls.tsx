"use client";
import { useEditor } from "@/stores/editor";
import {
  deleteActiveFloor,
  addFloor,
  floorList,
  groundFloor,
  switchFloor,
} from "@/lib/floors";

export default function FloorControls({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const s = useEditor();
  const p = s.project;
  if (!p) return null;
  const active = p.activeFloor ?? groundFloor;
  return (
    <div className="floor-controls">
      <label>
        Floor
        <select
          aria-label="Active floor"
          value={active.id}
          onChange={(event) => {
            const id = event.target.value;
            if (readOnly) {
              const next = structuredClone(p);
              switchFloor(next, id);
              useEditor.setState({
                project: next,
                previewProject: null,
                selected: [],
                tool: "select",
              });
            } else {
              s.finishPreview(false);
              s.edit((project) => switchFloor(project, id));
              useEditor.setState({ selected: [], tool: "select" });
            }
          }}
        >
          {floorList(p).map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.elevation} m)
            </option>
          ))}
        </select>
      </label>
      {!readOnly && (
        <details>
          <summary>Manage floors</summary>
          <div className="floor-options">
            <button
              onClick={() => {
                s.finishPreview(false);
                s.edit(addFloor);
                useEditor.setState({ selected: [], tool: "select" });
              }}
            >
              Add floor
            </button>
            <label>
              Floor name
              <input
                aria-label="Floor name"
                value={active.name}
                maxLength={60}
                onChange={(e) => {
                  if (e.target.value.trim())
                    s.edit((p) => {
                      p.activeFloor = { ...active, name: e.target.value };
                    });
                }}
              />
            </label>
            <label>
              Elevation (m)
              <input
                aria-label="Floor elevation"
                type="number"
                min={-30}
                max={100}
                step={0.1}
                value={active.elevation}
                onChange={(e) => {
                  if (e.target.value !== "")
                    s.edit((p) => {
                      p.activeFloor = {
                        ...active,
                        elevation: Number(e.target.value),
                      };
                    });
                }}
              />
            </label>
            <button
              disabled={!p.floors?.length}
              onClick={() => {
                if (
                  confirm(
                    "Delete this floor and its contents? You can undo this change.",
                  )
                ) {
                  s.finishPreview(false);
                  s.edit(deleteActiveFloor);
                  useEditor.setState({ selected: [], tool: "select" });
                }
              }}
            >
              Delete floor
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
