"use client";
import { useState } from "react";
import type { Project } from "@/lib/model";
import { floorList, switchFloor } from "@/lib/floors";
import ProjectThumbnail, { comparisonViewBox } from "./project-thumbnail";
export type DesignVersion = { id: string; label: string; project: Project };
export default function VersionCompare({
  versions,
}: {
  versions: DesignVersion[];
}) {
  const [left, setLeft] = useState(versions[0]?.id ?? "");
  const [right, setRight] = useState(versions.at(-1)?.id ?? "");
  const [floor, setFloor] = useState(floorList(versions.at(-1)!.project)[0].id);
  const floors = Array.from(
    new Map(
      versions.flatMap((v) => floorList(v.project)).map((f) => [f.id, f]),
    ).values(),
  );
  const selected = [left, right].map((id) => {
    const project = structuredClone(
      (versions.find((v) => v.id === id) ?? versions[0]).project,
    );
    if (floorList(project).some((f) => f.id === floor))
      switchFloor(project, floor);
    return project;
  });
  const viewBox = comparisonViewBox(selected);
  return (
    <section
      className="version-compare"
      aria-label="Before and after comparison"
    >
      <h3>Before and after</h3>
      <p>
        Read-only design previews. Choose any two versions and a floor. Imported
        models use their bounding shapes.
      </p>
      <label>
        Comparison floor
        <select value={floor} onChange={(e) => setFloor(e.target.value)}>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <div className="comparison-columns">
        {[
          { label: "Before", value: left, set: setLeft },
          { label: "After", value: right, set: setRight },
        ].map((side) => {
          const version =
            versions.find((v) => v.id === side.value) ?? versions[0];
          if (!version) return null;
          const project = structuredClone(version.project),
            exists = floorList(project).some((f) => f.id === floor);
          if (exists) switchFloor(project, floor);
          return (
            <div key={side.label}>
              <label>
                {side.label}
                <select
                  aria-label={side.label + " version"}
                  value={version.id}
                  onChange={(e) => side.set(e.target.value)}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              {exists ? (
                <>
                  <ProjectThumbnail project={project} viewBox={viewBox} />
                  <p>
                    {project.rooms.length} rooms | {project.furniture.length}{" "}
                    furniture items | {project.walls.length} wall segments
                  </p>
                </>
              ) : (
                <p>This floor does not exist in this version.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
