"use client";
import { useEffect, useState } from "react";
import { floorTexture } from "@/lib/materials";
import { materialPresets } from "@/lib/material-presets";
import { useEditor } from "@/stores/editor";

export default function MaterialPicker() {
  const s = useEditor();
  const [images, setImages] = useState<Record<string, string>>({});
  const target =
    s.project &&
    [...s.project.rooms, ...s.project.walls, ...s.project.furniture].find(
      (o) => o.id === s.selected[0],
    );
  useEffect(() => {
    const next: Record<string, string> = {};
    materialPresets.forEach(({ material }) => {
      const texture = floorTexture(material.texture);
      next[material.texture] = (texture.image as HTMLCanvasElement).toDataURL();
      texture.dispose();
    });
    setImages(next);
  }, []);
  return (
    <div className="finish-library">
      <p>
        {target
          ? `Apply a finish to ${"name" in target ? target.name : "wall"}.`
          : "Select a room, wall, or furniture piece to apply a finish."}
      </p>
      {target && "model" in target && target.model && (
        <p>Imported models keep their embedded materials.</p>
      )}
      {materialPresets.map((preset) => (
        <button
          key={preset.name}
          disabled={!target || ("model" in target && !!target.model)}
          aria-label={`Apply ${preset.name}`}
          onClick={() =>
            s.edit((p) => {
              const object = [...p.rooms, ...p.walls, ...p.furniture].find(
                (o) => o.id === s.selected[0],
              );
              if (object) object.material = { ...preset.material };
            })
          }
        >
          <span
            className="finish-swatch"
            aria-hidden="true"
            style={{
              backgroundColor: preset.material.color,
              backgroundImage: images[preset.material.texture]
                ? `url(${images[preset.material.texture]})`
                : undefined,
            }}
          />
          <strong>{preset.name}</strong>
          <small>{preset.category}</small>
        </button>
      ))}
    </div>
  );
}
