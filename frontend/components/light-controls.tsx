"use client";
import type { Furniture } from "@/lib/model";
import { defaultLight, lightColor } from "@/lib/lighting";
import { useEditor } from "@/stores/editor";
export default function LightControls({ lamp }: { lamp: Furniture }) {
  const s = useEditor();
  const light = lamp.light ?? defaultLight;
  const patch = (change: Partial<typeof defaultLight>) =>
    s.patch(lamp.id, { light: { ...light, ...change } });
  return (
    <fieldset className="light-controls">
      <legend>{lamp.name} light</legend>
      <label>
        <input
          type="checkbox"
          checked={light.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />{" "}
        Light enabled
      </label>
      <label>
        Brightness (%)
        <input
          type="number"
          min={0}
          max={200}
          step={10}
          value={light.brightness}
          onChange={(e) => {
            if (e.target.value !== "")
              patch({ brightness: Number(e.target.value) });
          }}
        />
      </label>
      <label>
        Color temperature (K)
        <input
          type="range"
          min={1800}
          max={6500}
          step={100}
          value={light.temperature}
          onChange={(e) => patch({ temperature: Number(e.target.value) })}
          aria-valuetext={`${light.temperature} kelvin`}
        />
      </label>
      <p>
        <span
          className="light-color"
          style={{ background: lightColor(light.temperature) }}
          aria-hidden="true"
        />
        {light.temperature} K ·{" "}
        {light.temperature < 3500
          ? "Warm"
          : light.temperature < 5000
            ? "Neutral"
            : "Cool"}
      </p>
      <button className="secondary" onClick={() => s.select(lamp.id)}>
        Select {lamp.name}
      </button>
    </fieldset>
  );
}
