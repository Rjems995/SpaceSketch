import { create } from "zustand";
import { Project, Furniture, makeFurniture, projectSchema } from "@/lib/model";
import { toast } from "sonner";
type State = {
  project: Project | null;
  previewProject: Project | null;
  preview: (fn: (p: Project) => void) => void;
  finishPreview: (commit: boolean) => void;
  past: Project[];
  future: Project[];
  selected: string[];
  tool: string;
  view: "2d" | "3d" | "split";
  grid: boolean;
  snapping: boolean;
  transformMode: "translate" | "rotate" | "scale";
  gridStep: number;
  status: string;
  load: (p: Project) => void;
  edit: (fn: (p: Project) => void) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string, more?: boolean) => void;
  add: (kind: Furniture["kind"], x?: number, z?: number) => void;
  remove: () => void;
  duplicate: () => void;
  patch: (id: string, p: Partial<Furniture>) => void;
};
export const useEditor = create<State>((set, get) => ({
  project: null,
  previewProject: null,
  preview: (fn) => {
    const base = get().project;
    if (!base) return;
    const next = structuredClone(base);
    try { fn(next); } catch { return; }
    if (projectSchema.safeParse(next).success) set({ previewProject: next });
  },
  finishPreview: (commit) => {
    const next = get().previewProject;
    set({ previewProject: null });
    if (commit && next && JSON.stringify(next) !== JSON.stringify(get().project))
      get().edit(p => Object.assign(p, next));
  },
  past: [],
  future: [],
  selected: [],
  tool: "select",
  view: "3d",
  grid: true,
  snapping: true,
  transformMode: "translate",
  gridStep: 0.1,
  status: "Saved locally",
  load: (p) =>
    set({
      project: p,
      previewProject: null,
      past: [],
      future: [],
      selected: [],
      status: "Saved locally",
    }),
  edit: (fn) => {
    const s = get();
    if (!s.project) return;
    const p = structuredClone(s.project);
    try {
      fn(p);
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    const validation = projectSchema.safeParse(p);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }
    if (JSON.stringify(p).length > 5_000_000) {
      toast.error(
        "Project exceeds the 5 MB portable document limit. Remove imported assets or use smaller models.",
      );
      return;
    }
    p.updatedAt = new Date().toISOString();
    set({
      project: p,
      past: [...s.past, s.project].slice(-100),
      future: [],
      status: "Unsaved changes",
    });
  },
  undo: () => {
    const s = get();
    if (s.past.length)
      set({
        project: {
          ...s.past.at(-1)!,
          revision: s.project!.revision,
          cloudRevision: s.project!.cloudRevision,
        },
        past: s.past.slice(0, -1),
        future: [s.project!, ...s.future],
        status: "Unsaved changes",
      });
  },
  redo: () => {
    const s = get();
    if (s.future.length)
      set({
        project: {
          ...s.future[0],
          revision: s.project!.revision,
          cloudRevision: s.project!.cloudRevision,
        },
        past: [...s.past, s.project!],
        future: s.future.slice(1),
        status: "Unsaved changes",
      });
  },
  select: (id, more) =>
    set((s) => ({
      selected: more
        ? s.selected.includes(id)
          ? s.selected.filter((x) => x !== id)
          : [...s.selected, id]
        : id
          ? [id]
          : [],
    })),
  add: (kind, x, z) => {
    const o = makeFurniture(kind, x, z);
    get().edit((p) => p.furniture.push(o));
    set({ selected: [o.id] });
  },
  remove: () => {
    const ids = get().selected;
    get().edit((p) => {
      p.furniture = p.furniture.filter((o) => !ids.includes(o.id) || o.locked);
      p.walls = p.walls.filter((w) => !ids.includes(w.id));
      p.measurements = p.measurements.filter((m) => !ids.includes(m.id));
      p.openings = p.openings.filter(
        (o) => !ids.includes(o.id) && p.walls.some((w) => w.id === o.wallId),
      );
    });
    set({ selected: [] });
  },
  duplicate: () => {
    const ids = get().selected;
    get().edit((p) =>
      p.furniture.push(
        ...p.furniture
          .filter((o) => ids.includes(o.id))
          .map((o) => ({
            ...o,
            id: crypto.randomUUID(),
            x: o.x + 0.3,
            z: o.z + 0.3,
            locked: false,
          })),
      ),
    );
  },
  patch: (id, patch) =>
    get().edit((p) => {
      const o = p.furniture.find((o) => o.id === id);
      if (o) {
        const next = { ...patch };
        if (o.locked) {
          delete next.x;
          delete next.z;
          delete next.width;
          delete next.depth;
          delete next.height;
          delete next.rotation;
        }
        Object.assign(o, next);
      }
    }),
}));
