"use client";
import { useState } from "react";
import { curveWall } from "@/lib/curves";
import { useEditor } from "@/stores/editor";
export default function CurveWallControls({ id }: { id: string }) {
  const [bend, setBend] = useState(1);
  const s = useEditor();
  return (
    <details className="corner-editor">
      <summary>Curve this wall</summary>
      <p>
        Bend the midpoint sideways. Room floors follow the curve. This creates
        16 editable wall segments; remove openings first.
      </p>
      <label>
        Curve bend (m)
        <input
          aria-label="Curve bend"
          type="number"
          min={-20}
          max={20}
          step={0.1}
          value={bend}
          onChange={(e) => setBend(Number(e.target.value))}
        />
      </label>
      <button
        className="secondary"
        disabled={!Number.isFinite(bend) || Math.abs(bend) < 0.1}
        onClick={() => s.edit((p) => curveWall(p, id, bend))}
      >
        Apply wall curve
      </button>
    </details>
  );
}
