"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Home,
} from "lucide-react";
import type { Project } from "@/lib/model";
import { walkMove, walkStart } from "@/lib/walkthrough";
const eventName = "spacesketch-walk";
type Action =
  "forward" | "back" | "left" | "right" | "turn-left" | "turn-right" | "reset";
type Input = { action: Action; pressed: boolean };
const keyActions: Record<string, Action> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyQ: "turn-left",
  KeyE: "turn-right",
};
const editing = () =>
  !!document.activeElement?.closest(
    'input,select,textarea,[contenteditable="true"],[role="dialog"]',
  );
export function WalkCamera({ project: p }: { project: Project }) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>()),
    touch = useRef(new Set<Action>()),
    yaw = useRef(0),
    pitch = useRef(0);
  const project = useRef(p);
  useEffect(() => {
    project.current = p;
    camera.position.setY(p.camera.eyeHeight);
  }, [p, camera]);
  useEffect(() => {
    const canvas = gl.domElement;
    const reset = () => {
      const current = project.current,
        start = walkStart(current);
      camera.position.set(start.x, current.camera.eyeHeight, start.z);
      yaw.current = 0;
      pitch.current = 0;
      camera.rotation.set(0, 0, 0, "YXZ");
    };
    reset();
    const clear = () => {
      keys.current.clear();
      touch.current.clear();
      drag = null;
    };
    const down = (e: KeyboardEvent) => {
      if (
        editing() ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        !keyActions[e.code]
      )
        return;
      e.preventDefault();
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const input = (e: Event) => {
      const { action, pressed } = (e as CustomEvent<Input>).detail;
      if (action === "reset") {
        reset();
        clear();
      } else if (pressed) touch.current.add(action);
      else touch.current.delete(action);
    };
    let drag: { id: number; x: number; y: number } | null = null;
    const start = (e: PointerEvent) => {
      if (e.button !== 0) return;
      canvas.setAttribute("tabindex", "0");
      canvas.focus();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      yaw.current -= (e.clientX - drag.x) * 0.004;
      pitch.current = Math.max(
        -1.2,
        Math.min(1.2, pitch.current - (e.clientY - drag.y) * 0.004),
      );
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const stop = () => {
      drag = null;
    };
    const oldTouch = canvas.style.touchAction;
    canvas.style.setProperty("touch-action", "none");
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener(eventName, input);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    const focus = () => {
      if (editing()) clear();
    };
    document.addEventListener("focusin", focus);
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    canvas.addEventListener("lostpointercapture", stop);
    return () => {
      clear();
      canvas.style.setProperty("touch-action", oldTouch);
      canvas.removeAttribute("data-walk-position");
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener(eventName, input);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      document.removeEventListener("focusin", focus);
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", stop);
      canvas.removeEventListener("pointercancel", stop);
      canvas.removeEventListener("lostpointercapture", stop);
    };
  }, [camera, gl]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05),
      actions = new Set([
        ...touch.current,
        ...Array.from(keys.current, (k) => keyActions[k]),
      ]);
    if (editing()) {
      keys.current.clear();
      touch.current.clear();
      return;
    }
    yaw.current +=
      ((actions.has("turn-left") ? 1 : 0) -
        (actions.has("turn-right") ? 1 : 0)) *
      dt *
      1.5;
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
    let forward =
        (actions.has("forward") ? 1 : 0) - (actions.has("back") ? 1 : 0),
      side = (actions.has("right") ? 1 : 0) - (actions.has("left") ? 1 : 0);
    const length = Math.hypot(forward, side);
    if (length) {
      forward /= length;
      side /= length;
      const step = dt * p.camera.speed;
      const next = walkMove(
        p,
        { x: camera.position.x, z: camera.position.z },
        {
          x:
            (-Math.sin(yaw.current) * forward + Math.cos(yaw.current) * side) *
            step,
          z:
            (-Math.cos(yaw.current) * forward - Math.sin(yaw.current) * side) *
            step,
        },
      );
      camera.position.set(next.x, p.camera.eyeHeight, next.z);
    }
    gl.domElement.setAttribute(
      "data-walk-position",
      JSON.stringify({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw: yaw.current,
        pitch: pitch.current,
      }),
    );
  });
  return null;
}
export function WalkPad() {
  const send = (action: Action, pressed: boolean) =>
    window.dispatchEvent(
      new CustomEvent<Input>(eventName, { detail: { action, pressed } }),
    );
  const buttons: [Action, string, typeof ArrowUp][] = [
    ["turn-left", "Turn left", RotateCcw],
    ["forward", "Walk forward", ArrowUp],
    ["turn-right", "Turn right", RotateCw],
    ["left", "Step left", ArrowLeft],
    ["back", "Walk backward", ArrowDown],
    ["right", "Step right", ArrowRight],
  ];
  return (
    <div className="walk-pad" role="group" aria-label="Walk-through movement">
      <div className="walk-pad-grid">
        {buttons.map(([action, label, Icon]) => (
          <button
            key={action}
            aria-label={label}
            title={label}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.focus();
              e.currentTarget.setPointerCapture(e.pointerId);
              send(action, true);
            }}
            onPointerUp={() => send(action, false)}
            onPointerCancel={() => send(action, false)}
            onLostPointerCapture={() => send(action, false)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                send(action, true);
              }
            }}
            onKeyUp={() => send(action, false)}
            onBlur={() => send(action, false)}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
      <button className="walk-reset" onClick={() => send("reset", false)}>
        <Home size={16} />
        Reset position
      </button>
    </div>
  );
}
