"use client";
import { Home, Fence, Layers } from "lucide-react";
import { useEditor } from "@/stores/editor";
import type { Surface } from "@/lib/model";
import { exteriorFinishes, isExterior, makeExterior } from "@/lib/exteriors";
export function ExteriorTools() {
  const s = useEditor(),
    p = s.project!;
  const selected =
    p.surfaces.find((o) => s.selected.includes(o.id) && isExterior(o)) ??
    p.walls.find((w) => s.selected.includes(w.id));
  return (
    <section className="exterior-tools" aria-label="Exterior tools">
      <h3>Roof & exterior</h3>
      {(
        [
          { kind: "roof", label: "Add roof", icon: Home },
          { kind: "balcony", label: "Add balcony", icon: Layers },
          { kind: "boundary-fence", label: "Add fence", icon: Fence },
        ] as const
      ).map(({ kind, label, icon: Icon }) => (
        <button
          key={kind}
          onClick={() => {
            const o = makeExterior(p, kind);
            s.edit((p) => p.surfaces.push(o));
            s.select(o.id);
            useEditor.setState({ tool: "select" });
          }}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
      <label className="roof-visibility">
        <input
          type="checkbox"
          checked={s.roofsVisible}
          onChange={(e) =>
            useEditor.setState({ roofsVisible: e.target.checked })
          }
        />
        Show roofs in 3D
      </label>
      <p>
        Roofs initially fit the current floor&apos;s walls. Move and resize in
        Properties or drag the 2D footprint. Balconies have three railings and
        an open rear edge.
      </p>
      <h3>Exterior finishes</h3>
      <p>
        Select a wall, roof, balcony, or fence. Wall finishes apply to both
        sides.
      </p>
      <div className="exterior-finishes">
        {exteriorFinishes.map((f) => (
          <button
            key={f.name}
            disabled={!selected}
            aria-label={"Apply " + f.name}
            title={f.name}
            onClick={() =>
              s.edit((p) => {
                const wall = p.walls.find((w) => w.id === selected?.id),
                  o = p.surfaces.find((o) => o.id === selected?.id);
                if (wall) wall.material = structuredClone(f.material);
                if (o) {
                  o.finish = structuredClone(f.material);
                  o.color = f.material.color;
                }
              })
            }
          >
            <span style={{ background: f.material.color }} />
            {f.name}
          </button>
        ))}
      </div>
    </section>
  );
}
export function ExteriorProperties({ surface: o }: { surface: Surface }) {
  const edit = useEditor((s) => s.edit);
  const patch = (value: Partial<Surface>) =>
    edit((p) =>
      Object.assign(
        p.surfaces.find((s) => s.id === o.id)!,
        value,
      ),
    );
  if (!isExterior(o)) return null;
  return (
    <fieldset className="exterior-properties">
      <legend>Exterior settings</legend>
      {o.kind === "roof" && (
        <label>
          Roof style
          <select
            aria-label="Roof style"
            value={o.roofStyle ?? "gable"}
            onChange={(e) =>
              patch({ roofStyle: e.target.value as Surface["roofStyle"] })
            }
          >
            <option value="flat">Flat</option>
            <option value="gable">Gable</option>
            <option value="shed">Shed</option>
          </select>
        </label>
      )}
      {o.kind === "boundary-fence" && (
        <label>
          Fence style
          <select
            aria-label="Fence style"
            value={o.fenceStyle ?? "picket"}
            onChange={(e) =>
              patch({ fenceStyle: e.target.value as Surface["fenceStyle"] })
            }
          >
            <option value="picket">Picket</option>
            <option value="solid">Solid panel</option>
          </select>
        </label>
      )}
      {!(o.kind === "roof" && o.roofStyle === "flat") && (
        <label>
          {o.kind === "roof"
            ? "Roof rise (m)"
            : o.kind === "balcony"
              ? "Railing height (m)"
              : "Fence height (m)"}
          <input
            type="number"
            min=".1"
            max="10"
            step=".1"
            value={o.height ?? 1.2}
            onChange={(e) => {
              if (e.target.value !== "")
                patch({ height: Number(e.target.value) });
            }}
          />
        </label>
      )}
      <p>
        Elevation is relative to the current floor. Rectangular footprints can
        be rotated; roofs do not trim themselves to irregular rooms.
      </p>
    </fieldset>
  );
}
