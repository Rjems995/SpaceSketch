"use client";
import { useMemo } from "react";
import { placementChecks } from "@/lib/placement-checks";
import { useEditor } from "@/stores/editor";
export default function DesignChecks() {
  const s = useEditor();
  const p = s.previewProject ?? s.project;
  const issues = useMemo(() => (p ? placementChecks(p) : []), [p]);
  return (
    <section className="design-checks" aria-label="Furniture placement checks">
      <h3>Placement checks</h3>
      <p role="status">
        {issues.length
          ? `${issues.length} placement warnings`
          : "No furniture overlaps or blocked door approaches."}
      </p>
      <p>
        Advisory footprint checks; door approaches reserve 90 cm on each side.
        Rugs and wall art are excluded.
      </p>
      {issues.slice(0, 50).map((issue, i) => (
        <button key={i} onClick={() => s.select(issue.ids[0])}>
          {issue.message}
        </button>
      ))}
      {issues.length > 50 && <p>Showing the first 50 warnings.</p>}
    </section>
  );
}
