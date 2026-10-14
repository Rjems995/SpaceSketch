"use client";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Text,
  Group,
  Circle,
  Transformer,
} from "react-konva";
import Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { useEditor } from "@/stores/editor";
import { addRoom, addPolygonRoom, mat, Point } from "@/lib/model";
import { area, distance, format, snap, smartPosition } from "@/lib/geometry";
import { toast } from "sonner";
import { visibleDesign } from "@/lib/rooms";
import { insertWall } from "@/lib/topology";
import WallResizeControls from "./wall-resize-controls";
export default function FloorPlan() {
  const [polygon, setPolygon] = useState<Point[]>([]);
  const s = useEditor(),
    p = (s.previewProject ?? s.project)!;
  const holder = useRef<HTMLDivElement>(null),
    stage = useRef<Konva.Stage>(null),
    transform = useRef<Konva.Transformer>(null);
  const gesture = useRef<{ distance: number; x: number; y: number } | null>(
    null,
  );
  const [size, setSize] = useState({ width: 800, height: 600 }),
    [zoom, setZoom] = useState(70),
    [origin, setOrigin] = useState({ x: 100, y: 100 }),
    [start, setStart] = useState<Point | null>(null),
    [cursor, setCursor] = useState<Point | null>(null);
  // Omit minor lines when zoomed out, retaining exact multiples of the snap grid.
  const displayStep =
    s.gridStep * Math.max(1, Math.ceil(5 / (zoom * s.gridStep)));
  const gridStart =
    Math.floor(Math.min(-origin.x, -origin.y) / zoom / displayStep) *
    displayStep;
  const gridEnd =
    Math.ceil(
      Math.max(size.width - origin.x, size.height - origin.y) /
        zoom /
        displayStep,
    ) * displayStep;
  useEffect(() => {
    const observer = new ResizeObserver((e) => {
      setSize({
        width: e[0].contentRect.width,
        height: e[0].contentRect.height,
      });
      setZoom(
        Math.max(
          15,
          Math.min(
            85,
            (e[0].contentRect.width - 110) / 7,
            (e[0].contentRect.height - 170) / 5,
          ),
        ),
      );
      setOrigin({ x: 65, y: 95 });
    });
    if (holder.current) observer.observe(holder.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const nodes = s.selected
      .map((id) => stage.current?.findOne("#" + id))
      .filter(Boolean) as Konva.Node[];
    transform.current?.nodes(nodes.filter((n) => n.getAttr("draggable")));
  }, [s.selected, p.furniture]);
  const point = () => {
    const pos = stage.current?.getPointerPosition();
    if (!pos) return { x: 0, z: 0 };
    let x = (pos.x - origin.x) / zoom,
      z = (pos.y - origin.y) / zoom;
    if (s.snapping) {
      x = snap(x, s.gridStep);
      z = snap(z, s.gridStep);
      const endpoint = p.walls
        .flatMap((w) => [w.a, w.b])
        .find((a) => distance(a, { x, z }) < 0.15);
      if (endpoint) return endpoint;
    }
    return { x, z };
  };
  const click = () => {
    const q = point();
    if (s.tool === "polygon") {
      if (polygon.length >= 3 && distance(q, polygon[0]) < 0.2) {
        s.edit((p) => addPolygonRoom(p, polygon));
        setPolygon([]);
      } else setPolygon([...polygon, q]);
      return;
    }
    if (["wall", "room", "measure"].includes(s.tool)) {
      if (!start) {
        setStart(q);
        return;
      }
      if (
        s.tool === "room" &&
        Math.abs(q.x - start.x) > 0.5 &&
        Math.abs(q.z - start.z) > 0.5
      )
        s.edit((p) =>
          addRoom(
            p,
            Math.min(q.x, start.x),
            Math.min(q.z, start.z),
            Math.abs(q.x - start.x),
            Math.abs(q.z - start.z),
          ),
        );
      if (s.tool === "wall" && distance(start, q) > 0.2)
        s.edit((p) =>
          insertWall(p, {
            id: crypto.randomUUID(),
            a: start,
            b: q,
            height: 2.7,
            thickness: 0.15,
            material: mat("#e9e5da"),
          }),
        );
      if (s.tool === "measure" && distance(start, q) > 0.01) {
        s.edit((p) =>
          p.measurements.push({ id: crypto.randomUUID(), a: start, b: q }),
        );
        toast.info(`Distance: ${format(distance(start, q), p.units)}`);
      }
      setStart(null);
    } else if (
      stage.current?.getIntersection(stage.current.getPointerPosition()!) ===
      null
    )
      s.select("");
  };
  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStart(null);
        setPolygon([]);
      }
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, []);
  return (
    <div
      className="floor-holder"
      ref={holder}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData("furniture");
        const rect = holder.current!.getBoundingClientRect();
        if (kind)
          s.add(
            kind as Parameters<typeof s.add>[0],
            snap((e.clientX - rect.left - origin.x) / zoom),
            snap((e.clientY - rect.top - origin.y) / zoom),
          );
      }}
    >
      <Stage
        ref={stage}
        {...size}
        x={origin.x}
        y={origin.y}
        scaleX={zoom}
        scaleY={zoom}
        draggable={s.tool === "pan"}
        onDragEnd={(e) => {
          if (e.target === stage.current)
            setOrigin({ x: e.target.x(), y: e.target.y() });
        }}
        onMouseDown={click}
        onTouchStart={(e) => {
          if (e.evt.touches.length === 1) click();
          else {
            stage.current?.stopDrag();
            gesture.current = null;
          }
        }}
        onTouchEnd={() => {
          gesture.current = null;
        }}
        onTouchMove={(e) => {
          if (e.evt.touches.length !== 2) return;
          e.evt.preventDefault();
          stage.current?.stopDrag();
          const [a, b] = Array.from(e.evt.touches);
          const rect = holder.current!.getBoundingClientRect(),
            center = {
              x: (a.clientX + b.clientX) / 2 - rect.left,
              y: (a.clientY + b.clientY) / 2 - rect.top,
            },
            dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          const old = gesture.current;
          if (old) {
            const next = Math.max(
              15,
              Math.min(180, (zoom * dist) / old.distance),
            );
            setZoom(next);
            setOrigin({
              x: center.x - ((old.x - origin.x) * next) / zoom,
              y: center.y - ((old.y - origin.y) * next) / zoom,
            });
          }
          gesture.current = { distance: dist, ...center };
        }}
        onMouseMove={() => setCursor(point())}
        onWheel={(e) => {
          e.evt.preventDefault();
          const q = point(),
            pos = stage.current!.getPointerPosition()!,
            next = Math.max(
              15,
              Math.min(180, zoom * (e.evt.deltaY > 0 ? 0.92 : 1.08)),
            );
          setZoom(next);
          setOrigin({ x: pos.x - q.x * next, y: pos.y - q.z * next });
        }}
      >
        <Layer>
          {p.measurements.map((m) => (
            <Group key={m.id} onClick={() => s.select(m.id)}>
              <Line
                points={[m.a.x, m.a.z, m.b.x, m.b.z]}
                stroke="#ba7956"
                strokeWidth={0.018}
                dash={[0.07, 0.04]}
              />
              <Text
                x={(m.a.x + m.b.x) / 2}
                y={(m.a.z + m.b.z) / 2 - 0.2}
                text={format(distance(m.a, m.b), p.units)}
                fontSize={0.14}
                fill="#a96c4a"
              />
            </Group>
          ))}
          {polygon.length > 0 && (
            <>
              <Line
                points={[...polygon, ...(cursor ? [cursor] : [])].flatMap(
                  (p) => [p.x, p.z],
                )}
                stroke="#b86c44"
                strokeWidth={0.035}
                dash={[0.1, 0.1]}
              />
              <Circle
                x={polygon[0].x}
                y={polygon[0].z}
                radius={0.1}
                fill="#b86c44"
              />
            </>
          )}
          {s.grid &&
            Array.from(
              { length: Math.ceil((gridEnd - gridStart) / displayStep) + 1 },
              (_, i) => gridStart + i * displayStep,
            ).map((v) => (
              <Group key={v}>
                <Line
                  points={[v, gridStart, v, gridEnd]}
                  stroke="#d9d8d0"
                  strokeWidth={0.008}
                />
                <Line
                  points={[gridStart, v, gridEnd, v]}
                  stroke="#d9d8d0"
                  strokeWidth={0.008}
                />
              </Group>
            ))}
          {p.rooms
            .filter((r) => r.visible)
            .map((r) => (
              <Group key={r.id}>
                <Line
                  points={r.points.flatMap((q) => [q.x, q.z])}
                  closed
                  fill={r.material.color}
                  opacity={0.35}
                  onClick={() => s.select(r.id)}
                />
                <Text
                  x={r.points[0].x + 0.3}
                  y={r.points[0].z + 0.3}
                  text={`${r.name}\n${area(r.points).toFixed(1)} m²`}
                  fontSize={0.16}
                  lineHeight={1.5}
                  fill="#766c5e"
                />
              </Group>
            ))}
          {visibleDesign(p).walls.map((w) => (
            <Group key={w.id}>
              <Line
                points={[w.a.x, w.a.z, w.b.x, w.b.z]}
                stroke={s.selected.includes(w.id) ? "#b96f4b" : "#746f64"}
                strokeWidth={w.thickness}
                lineCap="square"
                onPointerDown={(e) => {
                  if (["select", "erase", "door", "window"].includes(s.tool)) {
                    e.cancelBubble = true;
                    if (s.tool === "erase") {
                      s.select(w.id);
                      s.remove();
                    } else if (s.tool === "door" || s.tool === "window") {
                      const q = point(),
                        len = distance(w.a, w.b),
                        offset =
                          ((q.x - w.a.x) * (w.b.x - w.a.x) +
                            (q.z - w.a.z) * (w.b.z - w.a.z)) /
                          (len * len),
                        width = s.tool === "door" ? 0.9 : 1.2;
                      if (len < width + 0.2) {
                        toast.error("Wall is too short for this opening.");
                        return;
                      }
                      const t = Math.max(
                        (width / 2 + 0.05) / len,
                        Math.min(1 - (width / 2 + 0.05) / len, offset),
                      );
                      if (
                        p.openings.some(
                          (o) =>
                            o.wallId === w.id &&
                            Math.abs(o.offset - t) * len <
                              (o.width + width) / 2 + 0.05,
                        )
                      ) {
                        toast.error("Openings cannot overlap.");
                        return;
                      }
                      const openingId = crypto.randomUUID();
                      s.edit((p) =>
                        p.openings.push({
                          id: openingId,
                          wallId: w.id,
                          kind: s.tool as "door" | "window",
                          offset: t,
                          width,
                          height: s.tool === "door" ? 2.1 : 1.3,
                          sill: s.tool === "door" ? 0 : 0.9,
                        }),
                      );
                      if (useEditor.getState().project?.openings.some(o => o.id === openingId)) {
                        s.select(openingId);
                        useEditor.setState({ tool: "select" });
                      }
                    } else s.select(w.id);
                  }
                }}
              />
              <Text
                x={(w.a.x + w.b.x) / 2 + 0.12}
                y={(w.a.z + w.b.z) / 2 - 0.25}
                text={format(distance(w.a, w.b), p.units)}
                fontSize={0.13}
                fill="#686a60"
              />
            </Group>
          ))}
          {visibleDesign(p).openings.map((o) => {
            const w = p.walls.find((w) => w.id === o.wallId);
            if (!w) return null;
            return (
              <Group
                key={o.id}
                x={w.a.x + (w.b.x - w.a.x) * o.offset}
                y={w.a.z + (w.b.z - w.a.z) * o.offset}
                rotation={
                  (Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x) * 180) / Math.PI
                }
                onClick={() => s.select(o.id)}
              >
                <Rect
                  x={-o.width / 2}
                  y={-w.thickness / 2}
                  width={o.width}
                  height={w.thickness}
                  fill={o.kind === "door" ? "#f4f2ec" : "#b5d3da"}
                  stroke="#7d969a"
                  strokeWidth={0.02}
                />
                {o.kind === "door" && (
                  <Line
                    points={[-o.width / 2, 0, -o.width / 2, o.width]}
                    stroke="#a18a6b"
                    strokeWidth={0.03}
                  />
                )}
              </Group>
            );
          })}
          {visibleDesign(p).furniture.map((o) => (
            <Group
              id={o.id}
              key={o.id}
              x={o.x}
              y={o.z}
              rotation={o.rotation}
              draggable={!o.locked && s.tool === "select"}
              onMouseDown={(e) => {
                if (s.tool === "select" || s.tool === "erase") {
                  e.cancelBubble = true;
                  s.select(o.id, e.evt.shiftKey);
                  if (s.tool === "erase") s.remove();
                }
              }}
              onTap={() => s.select(o.id)}
              onDragEnd={(e) => {
                const next = { ...o, x: e.target.x(), z: e.target.y() };
                const pos = s.snapping
                  ? smartPosition(next, p.furniture, p.walls, s.gridStep)
                  : { x: next.x, z: next.z };
                const dx = pos.x - o.x,
                  dz = pos.z - o.z;
                s.edit((p) =>
                  p.furniture.forEach((item) => {
                    if (
                      !item.locked &&
                      (item.id === o.id || s.selected.includes(item.id))
                    ) {
                      item.x += dx;
                      item.z += dz;
                    }
                  }),
                );
              }}
              onTransformEnd={(e) => {
                const n = e.target;
                s.patch(o.id, {
                  x: n.x(),
                  z: n.y(),
                  rotation: s.snapping ? snap(n.rotation(), 15) : n.rotation(),
                  width: Math.max(0.1, Math.min(10, o.width * n.scaleX())),
                  depth: Math.max(0.1, Math.min(10, o.depth * n.scaleY())),
                });
                n.scale({ x: 1, y: 1 });
              }}
            >
              <Rect
                x={-o.width / 2}
                y={-o.depth / 2}
                width={o.width}
                height={o.depth}
                cornerRadius={o.kind === "table" ? o.width / 2 : 0.07}
                fill={o.material.color}
                stroke={s.selected.includes(o.id) ? "#b86c44" : "#817566"}
                strokeWidth={0.025}
                opacity={o.kind === "rug" ? 0.5 : 1}
              />
              {["sofa", "bed", "chair"].includes(o.kind) && (
                <Rect
                  x={-o.width * 0.42}
                  y={-o.depth * 0.42}
                  width={o.width * 0.84}
                  height={o.depth * 0.2}
                  cornerRadius={0.04}
                  stroke="#807467"
                  strokeWidth={0.015}
                />
              )}
              <Text
                x={-o.width / 2}
                y={-0.055}
                width={o.width}
                text={o.kind}
                align="center"
                fontSize={0.12}
                fill="#544d43"
              />
            </Group>
          ))}
          {start &&
            cursor &&
            (s.tool === "room" ? (
              <Rect
                x={Math.min(start.x, cursor.x)}
                y={Math.min(start.z, cursor.z)}
                width={Math.abs(cursor.x - start.x)}
                height={Math.abs(cursor.z - start.z)}
                stroke="#b86c44"
                strokeWidth={0.025}
                dash={[0.1, 0.1]}
              />
            ) : (
              <Line
                points={[start.x, start.z, cursor.x, cursor.z]}
                stroke="#b86c44"
                strokeWidth={0.035}
                dash={[0.1, 0.1]}
              />
            ))}
          <Transformer
            ref={transform}
            rotateEnabled
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ]}
            anchorSize={7}
            borderStroke="#b86c44"
            anchorStroke="#b86c44"
          />
        </Layer>
      </Stage>
      {s.tool === "select" && p.walls.filter(w => s.selected.includes(w.id)).slice(0, 1).map(w => (
        <WallResizeControls key={w.id} wall={w} positions={{
          a: { x: origin.x + w.a.x * zoom, y: origin.y + w.a.z * zoom, dx: (w.a.x - w.b.x) / distance(w.a, w.b) * zoom, dy: (w.a.z - w.b.z) / distance(w.a, w.b) * zoom },
          b: { x: origin.x + w.b.x * zoom, y: origin.y + w.b.z * zoom, dx: (w.b.x - w.a.x) / distance(w.a, w.b) * zoom, dy: (w.b.z - w.a.z) / distance(w.a, w.b) * zoom },
          height: { x: origin.x + (w.a.x + w.b.x) / 2 * zoom, y: origin.y + (w.a.z + w.b.z) / 2 * zoom - 55, dx: 0, dy: -80 },
        }} />      ))}
      <div className="canvas-hint">
        {s.tool === "select"
          ? "Drag to move · Shift + click to select multiple"
          : s.tool === "door" || s.tool === "window"
            ? "Click a wall to place an opening"
            : s.tool === "pan"
              ? "Drag the canvas to pan"
              : s.tool === "polygon"
                ? "Click corners, then the first point to close the room"
                : "Click a start point, then an end point"}{" "}
        · Scroll to zoom
      </div>
    </div>
  );
}
