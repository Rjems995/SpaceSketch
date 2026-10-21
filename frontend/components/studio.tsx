"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  Star,
  ArrowLeft,
  ArrowUpRight,
  Armchair,
  Box,
  Check,
  ChevronDown,
  Copy,
  Download,
  FolderOpen,
  Grid2X2,
  Hand,
  Home,
  Layers,
  Leaf,
  Lock,
  Maximize,
  MousePointer2,
  PanelLeftClose,
  Plus,
  Redo2,
  Ruler,
  Save,
  Search,
  Settings2,
  Share2,
  Square,
  Sun,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Furniture, Project, template, surfaceKinds } from "@/lib/model";
import { area, corners, format, overlap, wallCorners } from "@/lib/geometry";
import { useEditor } from "@/stores/editor";
import {
  deleteLocal,
  download,
  importProject,
  listProjects,
  saveLocal,
} from "@/lib/storage";
import { supabase, cloudProjects, deleteCloudProject } from "@/lib/supabase";
import CloudPanel from "./cloud-panel";
import { ExteriorTools, ExteriorProperties } from "./exterior-tools";
import HomeHero from "./home-hero";
import OfflineSync, { currentAccount, syncPending } from "./offline-sync";
import { enqueueSave, pendingSaves, removePending } from "@/lib/sync-queue";
import FurnitureIcon from "./furniture-icon";
import BrandLogo from "./brand-logo";
import type { PreviewImages } from "./furniture-previews";
import { useDialogFocus } from "./use-dialog-focus";
import { useFavorites } from "./use-favorites";
import { searchCatalog } from "@/lib/catalog-search";
import LightControls from "./light-controls";
import ProjectThumbnail from "./project-thumbnail";
import CostBreakdown from "./cost-breakdown";
import { shoppingListCsv } from "@/lib/costs";
import FloorControls from "./floor-controls";
import RoomCorners from "./room-corners";
import CurveWallControls from "./curve-wall-controls";
import MaterialPicker from "./material-picker";
import DesignChecks from "./design-checks";
import Image from "next/image";
const FurniturePreviews = dynamic(() => import("./furniture-previews"), {
  ssr: false,
});
import {
  resizeRoom,
  splitWall,
  deleteRoom,
  moveWallEndpoint,
} from "@/lib/rooms";
import {
  mergeCloudProjects,
  saveDraft,
  clearDraft,
  recoverDraft,
} from "@/lib/storage";
const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => <div className="empty">Preparing your studio…</div>,
});
const FloorPlan = dynamic(() => import("./floor-plan"), {
  ssr: false,
  loading: () => <div className="empty">Preparing floor plan…</div>,
});
const templates = [
  "Empty Room",
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Studio Apartment",
  "Office",
  "Outdoor Patio",
];
export default function Studio({ projectId }: { projectId?: string } = {}) {
  const { favorites, toggleFavorite } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [previews, setPreviews] = useState<PreviewImages>({});
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const router = useRouter();
  const [missing, setMissing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const s = useEditor();
  useEffect(() => setPropertiesCollapsed(false), [s.selected]);
  const [projects, setProjects] = useState<Project[]>([]),
    [ready, setReady] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [tab, setTab] = useState("Furniture"),
    [quality, setQuality] = useState("High"),
    [walk, setWalk] = useState(false),
    [ceiling, setCeiling] = useState(false),
    [presentation, setPresentation] = useState(false),
    [sidebar, setSidebar] = useState(false),
    [auth, setAuth] = useState(false),
    [user, setUser] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const closeDialog = useCallback(() => {
    setAuth(false);
    setSharing(false);
  }, []);
  useDialogFocus(auth || sharing, closeDialog);
  const input = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const p = s.project;
  const filteredCatalog = searchCatalog(
    query,
    category,
    favorites,
    favoritesOnly,
  );
  const preset = p?.camera.preset ?? "Isometric";
  useEffect(() => {
    try {
      const saved = listProjects();
      setProjects(saved);
      if (projectId) {
        const draft = recoverDraft();
        const project =
          draft?.id === projectId
            ? draft
            : saved.find((p) => p.id === projectId);
        if (project) {
          useEditor.getState().load(project);
          if (project === draft) {
            useEditor.setState({ status: "Unsaved changes" });
            toast.info("Recovered your interrupted editing session.");
          }
        } else setMissing(true);
      } else useEditor.setState({ project: null });
    } catch {
      toast.error(
        "Saved projects could not be read. Import a backup to recover.",
      );
    }
    setReady(true);
    if (supabase) {
      supabase.auth
        .getSession()
        .then(({ data }) => setUser(data.session?.user.email ?? null));
      const { data } = supabase.auth.onAuthStateChange((_, session) =>
        setUser(session?.user.email ?? null),
      );
      return () => data.subscription.unsubscribe();
    }
  }, [projectId]);
  const save = useCallback(async () => {
    if (saving.current) return;
    const current = useEditor.getState().project;
    if (!current) return;
    saving.current = true;
    try {
      const next = saveLocal(current);
      clearDraft();
      if (useEditor.getState().project === current)
        useEditor.setState({ project: next, status: "Saved locally" });
      if (supabase && user) {
        const account = await currentAccount();
        if (account) {
          enqueueSave(account, next);
          if (useEditor.getState().project === next)
            useEditor.setState({ status: "Saved locally - queued for cloud" });
          // New edits can be saved locally while this upload is in progress.
          saving.current = false;
          await syncPending(account);
        }
      }
    } catch (e) {
      useEditor.setState({ status: "Save failed — click to retry" });
      toast.error((e as Error).message);
    } finally {
      saving.current = false;
    }
  }, [user]);
  useEffect(() => {
    if (s.status !== "Unsaved changes") return;
    if (p)
      try {
        saveDraft(p);
      } catch {
        toast.error("Recovery storage is full. Export a JSON backup.");
      }
    const timer = setTimeout(save, 900);
    return () => clearTimeout(timer);
  }, [p, s.status, save]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable=true],[role=dialog]",
        )
      )
        return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["z", "y", "d", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (e.key === "z") e.shiftKey ? s.redo() : s.undo();
        if (e.key === "y") s.redo();
        if (e.key === "d") s.duplicate();
        if (e.key === "s") void save();
      }
      if (e.key === "Delete") s.remove();
      if (e.key === "Escape") {
        s.select("");
        setWalk(false);
        setPresentation(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [s, save]);
  const open = (project: Project) => {
    s.load(project);
    setQuery("");
    setCategory("All");
    router.push(`/editor/${project.id}`);
  };
  const create = (name: string) => {
    const next = saveLocal(template(name));
    setProjects(listProjects());
    open(next);
  };
  const exported = async (type: string) => {
    if (!p) return;
    try {
      if (type === "json")
        download(
          new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
          `${p.name}.json`,
        );
      else if (type === "csv") {
        download(
          new Blob([shoppingListCsv(p)], { type: "text/csv;charset=utf-8" }),
          `${p.name}-shopping-list.csv`,
        );
      } else if (type === "pdf") {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(20);
        doc.text(
          p.name + " - " + (p.activeFloor?.name ?? "Ground floor"),
          15,
          18,
        );
        doc.setFontSize(10);
        doc.text(
          `${p.rooms.reduce((a, r) => a + area(r.points), 0).toFixed(1)} m² · Exported ${new Date().toLocaleDateString()}`,
          15,
          26,
        );
        const pts = [
          ...p.walls.flatMap((w) => [w.a, w.b]),
          ...p.rooms.flatMap((r) => r.points),
          ...p.furniture.flatMap(corners),
          ...p.surfaces.flatMap((o) => corners(o)),
        ];
        const minX = Math.min(0, ...pts.map((q) => q.x)),
          minZ = Math.min(0, ...pts.map((q) => q.z)),
          maxX = Math.max(7, ...pts.map((q) => q.x)),
          maxZ = Math.max(5, ...pts.map((q) => q.z));
        const scale = Math.min(250 / (maxX - minX), 145 / (maxZ - minZ)),
          x = (v: number) => 20 + (v - minX) * scale,
          y = (v: number) => 45 + (v - minZ) * scale;
        p.surfaces.forEach((o) => {
          const boundary = corners(o);
          doc.setDrawColor(o.color);
          doc.setLineWidth(0.5);
          boundary.forEach((q, i) =>
            doc.line(
              x(q.x),
              y(q.z),
              x(boundary[(i + 1) % 4].x),
              y(boundary[(i + 1) % 4].z),
            ),
          );
          doc.setFontSize(8);
          doc.text(o.name, x(o.x), y(o.z));
        });
        doc.setDrawColor("#444444");
        p.walls.forEach((w) => {
          doc.setLineWidth(w.thickness * scale);
          doc.line(x(w.a.x), y(w.a.z), x(w.b.x), y(w.b.z));
          doc.setFontSize(8);
          doc.text(
            format(Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z), p.units),
            x((w.a.x + w.b.x) / 2) + 2,
            y((w.a.z + w.b.z) / 2) - 3,
          );
        });
        p.rooms.forEach((r) =>
          doc.text(
            `${r.name} ${area(r.points).toFixed(1)} m²`,
            x(r.points.reduce((a, q) => a + q.x, 0) / r.points.length),
            y(r.points.reduce((a, q) => a + q.z, 0) / r.points.length),
          ),
        );
        p.furniture.forEach((o) => {
          const pts = corners(o);
          doc.setLineWidth(0.3);
          pts.forEach((q, i) =>
            doc.line(
              x(q.x),
              y(q.z),
              x(pts[(i + 1) % 4].x),
              y(pts[(i + 1) % 4].z),
            ),
          );
        });
        p.openings.forEach((o) => {
          const w = p.walls.find((w) => w.id === o.wallId)!;
          const length = Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z);
          const dx = (w.b.x - w.a.x) / length,
            dz = (w.b.z - w.a.z) / length;
          const cx = w.a.x + (w.b.x - w.a.x) * o.offset,
            cz = w.a.z + (w.b.z - w.a.z) * o.offset;
          doc.setDrawColor(o.kind === "door" ? "#ffffff" : "#80b4ca");
          doc.setLineWidth(w.thickness * scale + 0.3);
          doc.line(
            x(cx - (dx * o.width) / 2),
            y(cz - (dz * o.width) / 2),
            x(cx + (dx * o.width) / 2),
            y(cz + (dz * o.width) / 2),
          );
          doc.setTextColor("#333333");
          doc.setFontSize(7);
          doc.text(
            o.kind + " " + format(o.width, p.units),
            x(cx) + 2,
            y(cz) + 4,
          );
        });
        p.measurements.forEach((m) => {
          doc.setDrawColor("#477789");
          doc.setLineWidth(0.3);
          doc.line(x(m.a.x), y(m.a.z), x(m.b.x), y(m.b.z));
          doc.text(
            format(Math.hypot(m.b.x - m.a.x, m.b.z - m.a.z), p.units),
            x((m.a.x + m.b.x) / 2),
            y((m.a.z + m.b.z) / 2) - 2,
          );
        });
        doc.setFontSize(8);
        doc.setTextColor("#333333");
        doc.text(
          "Dimensions in " + p.units + ". Room areas in square meters.",
          15,
          203,
        );
        doc.save(p.name + ".pdf");
      } else {
        if (s.view === "2d") {
          toast.info("Switch to 3D before exporting an image or GLB.");
          return;
        }
        window.dispatchEvent(new CustomEvent("scene-export", { detail: type }));
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const obj = p?.furniture.find((o) => o.id === s.selected[0]);
  const wall = p?.walls.find((o) => o.id === s.selected[0]);
  const room = p?.rooms.find((o) => o.id === s.selected[0]);
  const opening = p?.openings.find((o) => o.id === s.selected[0]);
  const surface = p?.surfaces.find((o) => o.id === s.selected[0]);
  const overlapWarning =
    obj &&
    obj.kind !== "rug" &&
    p?.furniture.some(
      (o) =>
        o.id !== obj.id &&
        o.kind !== "rug" &&
        overlap(corners(obj), corners(o)),
    );
  const wallWarning =
    obj && p?.walls.some((w) => overlap(corners(obj), wallCorners(w)));
  if (!ready) return <div className="empty full">Opening SpaceSketch…</div>;
  if (missing)
    return (
      <div className="empty full">
        <div>
          <h2>Project not found in this browser</h2>
          <p>
            Load your cloud projects or import a JSON backup from the dashboard.
          </p>
          <button className="primary" onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </button>
        </div>
      </div>
    );
  return (
    <div
      className={`app ${!p ? "home-dashboard" : ""} ${presentation ? "presentation" : ""}`}
    >
      <OfflineSync />
      <input
        hidden
        ref={modelInput}
        type="file"
        accept=".glb,.gltf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const license = prompt(
            "Model license or permission to use this asset",
            "User-provided asset",
          );
          if (license === null) return;
          const attribution =
            prompt("Model author/source attribution (optional)", "") ?? "";
          try {
            const { importFurnitureModel } = await import("@/lib/import-model");
            const object = await importFurnitureModel(
              file,
              license,
              attribution,
            );
            s.edit((p) => p.furniture.push(object));
            s.select(object.id);
            toast.success("Model imported. Verify its dimensions in meters.");
          } catch (error) {
            toast.error((error as Error).message);
          }
        }}
      />
      <input
        ref={input}
        type="file"
        accept=".json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file)
            try {
              const next = saveLocal(await importProject(file));
              setProjects(listProjects());
              open(next);
              toast.success("Project imported");
            } catch (err) {
              toast.error((err as Error).message);
            }
          e.target.value = "";
        }}
      />
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={async (e) => {
            e.preventDefault();
            if (p) await save();
            useEditor.setState({ project: null });
            setProjects(listProjects());
            router.push("/dashboard");
          }}
        >
          <BrandLogo />
          <span className="beta">STUDIO</span>
        </a>
        {p ? (
          <>
            <span className="divider" />
            <input
              className="project-name"
              aria-label="Project name"
              value={p.name}
              onChange={(e) =>
                s.edit((p) => {
                  p.name = e.target.value || "Untitled project";
                })
              }
            />
            <button className="save-status" onClick={save}>
              <Check size={13} />
              {s.status}
            </button>
            <div className="history">
              <button
                aria-label="Undo (Ctrl+Z)"
                title="Undo (Ctrl+Z)"
                disabled={!s.past.length}
                onClick={s.undo}
              >
                <Undo2 size={17} />
              </button>
              <button
                aria-label="Redo (Ctrl+Y)"
                title="Redo (Ctrl+Y)"
                disabled={!s.future.length}
                onClick={s.redo}
              >
                <Redo2 size={17} />
              </button>
            </div>
            <div className="view-switch">
              {(["2d", "3d", "split"] as const).map((v) => (
                <button
                  key={v}
                  className={s.view === v ? "active" : ""}
                  onClick={() => useEditor.setState({ view: v })}
                >
                  {v === "split" ? "Split view" : v.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="top-actions">
              <button
                aria-label="Save project"
                title="Save project"
                onClick={save}
              >
                <Save size={18} />
              </button>
              <select
                aria-label="Select design object"
                value={s.selected[0] ?? ""}
                onChange={(e) => s.select(e.target.value)}
              >
                <option value="">Select an object</option>
                {[
                  ...p.rooms,
                  ...p.walls,
                  ...p.openings,
                  ...p.furniture,
                  ...p.surfaces,
                ].map((o, i) => (
                  <option key={o.id} value={o.id}>
                    {"name" in o ? o.name : "kind" in o ? o.kind : "Wall"} (
                    {i + 1})
                  </option>
                ))}
              </select>
              <select
                aria-label="Export project"
                value=""
                onChange={(e) => void exported(e.target.value)}
              >
                <option value="" disabled>
                  Export ↗
                </option>
                <option value="json">JSON backup</option>
                <option value="csv">Shopping list (CSV)</option>
                <option value="pdf">PDF current floor</option>
                <option value="png">PNG image (3840 px)</option>
                <option value="jpg">JPEG image (3840 px)</option>
                <option value="glb">GLB scene</option>
              </select>
              <button
                className="primary small"
                onClick={() => setSharing(true)}
              >
                <Share2 size={15} />
                Share
              </button>
            </div>
          </>
        ) : (
          <nav className="home-nav" aria-label="Main navigation">
            <a href="#your-projects">Your projects</a>
            <a href="#home-templates">Templates</a>
            <button onClick={() => create("Living Room")}>
              Explore 3D <ArrowUpRight size={12} />
            </button>
          </nav>
        )}
        <button
          className={user ? "avatar" : "avatar login-entry"}
          title={user || "Account"}
          aria-label={user ? "Your account" : "Log in"}
          onClick={async () => {
            if (user) setAuth(true);
            else {
              if (p) await save();
              router.push(
                "/login" +
                  (p ? "?next=" + encodeURIComponent("/editor/" + p.id) : ""),
              );
            }
          }}
        >
          {user ? user[0].toUpperCase() : "Log in"}
        </button>
      </header>
      {!p ? (
        <main className="dashboard">
          <HomeHero create={create} />
          <div className="home-library" id="your-projects">
            <div className="section-title">
              <div>
                <h2>
                  Your projects <span>{projects.length}</span>
                </h2>
                <p>Good spaces start with a good idea.</p>
              </div>
              <div className="row">
                <button
                  className="secondary"
                  onClick={() => input.current?.click()}
                >
                  <Upload size={16} />
                  Import
                </button>
                {user && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      try {
                        const cloud = await cloudProjects();
                        const account = await currentAccount();
                        const queued = account
                          ? pendingSaves(account).map((e) => e.project.id)
                          : [];
                        setProjects(
                          mergeCloudProjects(
                            cloud.filter((p) => !queued.includes(p.id)),
                          ),
                        );
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    Load cloud projects
                  </button>
                )}
                <label className="search">
                  <Search size={16} />
                  <input
                    placeholder="Search projects"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="project-grid">
              {projects
                .filter((p) =>
                  p.name.toLowerCase().includes(query.toLowerCase()),
                )
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .map((project) => (
                  <motion.article
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="project-card"
                    key={project.id}
                  >
                    <button
                      className="project-preview"
                      aria-label={`Open ${project.name}`}
                      onClick={() => open(project)}
                    >
                      <ProjectThumbnail project={project} />
                      <small className="thumbnail-floor">
                        {project.activeFloor?.name ?? "Ground floor"} ·{" "}
                        {(project.floors?.length ?? 0) + 1} floor(s)
                      </small>

                      <span>
                        Open design <ArrowUpRight size={14} />
                      </span>
                    </button>
                    <div className="project-info">
                      <button
                        className="project-title"
                        onClick={() => open(project)}
                      >
                        {project.name}
                      </button>
                      <p>
                        {project.rooms
                          .reduce((a, r) => a + area(r.points), 0)
                          .toFixed(0)}{" "}
                        m² <span>·</span> Edited{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                      <div className="card-actions">
                        <button
                          aria-label="Rename project"
                          title="Rename project"
                          onClick={async () => {
                            const name = prompt("Project name", project.name);
                            if (name) {
                              try {
                                const renamed = saveLocal({
                                  ...project,
                                  name: name.slice(0, 100),
                                  updatedAt: new Date().toISOString(),
                                });
                                if (user) {
                                  const account = await currentAccount();
                                  if (account) {
                                    enqueueSave(account, renamed);
                                    window.dispatchEvent(
                                      new Event("spacesketch-sync-now"),
                                    );
                                  }
                                }
                              } catch (e) {
                                toast.error((e as Error).message);
                              } finally {
                                setProjects(listProjects());
                              }
                            }
                          }}
                        >
                          <Settings2 size={14} />
                        </button>
                        <button
                          aria-label="Duplicate project"
                          title="Duplicate project"
                          onClick={() => {
                            saveLocal({
                              ...project,
                              id: crypto.randomUUID(),
                              name: `${project.name} copy`,
                              revision: 0,
                              cloudRevision: 0,
                            });
                            setProjects(listProjects());
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          aria-label="Delete project"
                          title="Delete project"
                          onClick={async () => {
                            if (
                              confirm(
                                `Delete “${project.name}”? This cannot be undone.`,
                              )
                            ) {
                              try {
                                if (project.cloudRevision > 0) {
                                  if (!user)
                                    throw new Error(
                                      "Sign in before deleting a cloud-synced project.",
                                    );
                                  await deleteCloudProject(project.id);
                                }
                                deleteLocal(project.id);
                                const account = await currentAccount();
                                if (account) removePending(account, project.id);
                                setProjects(listProjects());
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              <button className="new-card" onClick={() => create("Empty Room")}>
                <span>
                  <Plus size={26} />
                </span>
                <strong>A blank canvas</strong>
                <small>Make room for something new</small>
              </button>
            </div>
            <div className="section-title">
              <div>
                <h2 id="home-templates">A starting point for every space</h2>
                <p>Editable templates to get your ideas moving.</p>
              </div>
            </div>
            <div className="templates">
              {templates.map((t, i) => (
                <button key={t} onClick={() => create(t)}>
                  <span>
                    {i === 0 ? (
                      <Plus />
                    ) : i === 1 ? (
                      <Armchair />
                    ) : i === 6 ? (
                      <Box />
                    ) : (
                      <Home />
                    )}
                  </span>
                  {t}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
            <footer>
              DESIGNED FOR YOUR EVERYDAY EXTRAORDINARY
              <span>Local demo · Your projects stay in this browser</span>
            </footer>
          </div>
        </main>
      ) : (
        <>
          <div className="editor">
            <nav className="rail">
              {[
                { name: "Furniture", icon: Armchair },
                { name: "Build", icon: Home },
                { name: "Materials", icon: Layers },
                { name: "Lighting", icon: Sun },
                { name: "Costs", icon: ClipboardList },
              ].map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  title={name}
                  className={tab === name ? "active" : ""}
                  onClick={() => {
                    setTab(name);
                    setSidebar(true);
                  }}
                >
                  <Icon size={22} />
                  <span>{name}</span>
                </button>
              ))}
              <button
                className="rail-bottom"
                aria-label="Import project"
                title="Import project"
                onClick={() => input.current?.click()}
              >
                <Upload size={21} />
                <span>Import</span>
              </button>
            </nav>
            <aside className={`library ${sidebar ? "mobile-open" : ""}`}>
              <div className="panel-heading">
                <div>
                  <h2>{tab}</h2>
                  <p>
                    {tab === "Furniture"
                      ? "Find the pieces that feel like you."
                      : "Shape the space around you."}
                  </p>
                </div>
                <button
                  aria-label="Collapse library"
                  title="Collapse library"
                  onClick={() => setSidebar(false)}
                >
                  <PanelLeftClose size={17} />
                </button>
              </div>
              {tab === "Furniture" ? (
                <>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search furniture"
                      placeholder="Search name, type, or category"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <button
                    className="favorites-filter"
                    aria-pressed={favoritesOnly}
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                  >
                    <Star size={16} />
                    Favorites ({favorites.length})
                  </button>
                  <p className="library-tip">
                    Favorites are saved in this browser.
                  </p>
                  <div className="categories">
                    {[
                      "All",
                      "Living",
                      "Bedroom",
                      "Kitchen",
                      "Bathroom",
                      "Office",
                      "Decor",
                      "Lighting",
                      "Outdoor",
                    ].map((c) => (
                      <button
                        key={c}
                        className={category === c ? "active" : ""}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="library-label">
                    <span>THE ESSENTIAL COLLECTION</span>
                    <span>{filteredCatalog.length}</span>
                  </div>
                  <button
                    className="secondary model-import"
                    onClick={() => modelInput.current?.click()}
                  >
                    <Upload size={14} />
                    Import GLB / glTF model
                  </button>
                  <div className="furniture-grid">
                    <FurniturePreviews onReady={setPreviews} />
                    {filteredCatalog.map((c) => (
                      <div
                        className="furniture-entry"
                        role="group"
                        aria-label={c.name}
                        key={c.kind}
                      >
                        <button
                          className="furniture-card"
                          draggable
                          onDragStart={(e) =>
                            e.dataTransfer.setData("furniture", c.kind)
                          }
                          onClick={() => s.add(c.kind)}
                        >
                          <div
                            className={`mini-furniture mini-${c.kind}`}
                            style={
                              {
                                "--furniture-color": c.color,
                              } as React.CSSProperties
                            }
                          >
                            {previews[c.kind] ? (
                              <Image
                                src={previews[c.kind]!}
                                alt={`${c.name} 3D preview`}
                                width={256}
                                height={192}
                                unoptimized
                                className="furniture-preview-image"
                                draggable={false}
                              />
                            ) : (
                              <FurnitureIcon kind={c.kind} />
                            )}
                          </div>
                          <strong>{c.name}</strong>
                          <span>
                            {c.size[0]} × {c.size[1]} m <Plus size={13} />
                          </span>
                        </button>
                        <button
                          className="favorite-toggle"
                          aria-label={
                            favorites.includes(c.kind)
                              ? "Unfavorite"
                              : "Favorite"
                          }
                          title={
                            (favorites.includes(c.kind)
                              ? "Unfavorite "
                              : "Favorite ") + c.name
                          }
                          aria-pressed={favorites.includes(c.kind)}
                          onClick={() => toggleFavorite(c.kind)}
                        >
                          <Star
                            size={17}
                            fill={
                              favorites.includes(c.kind)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                  {filteredCatalog.length === 0 && (
                    <div role="status" className="catalog-empty">
                      <p>
                        No matching furniture. Try another search or favorite a
                        piece.
                      </p>
                      <button
                        onClick={() => {
                          setQuery("");
                          setCategory("All");
                          setFavoritesOnly(false);
                        }}
                      >
                        Show all furniture
                      </button>
                    </div>
                  )}
                  {category === "Outdoor" && (
                    <div className="build-tools">
                      <h3>Outdoor surfaces</h3>
                      <p>
                        Choose a surface, then tap two opposite corners in 2D.
                      </p>
                      {surfaceKinds.map((kind) => (
                        <button
                          key={kind}
                          onClick={() => {
                            useEditor.setState({
                              tool: `surface:${kind}`,
                              view: "2d",
                            });
                            setSidebar(false);
                          }}
                        >
                          Draw {kind}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="library-tip">
                    Click to add · Drag into the 2D floor plan
                  </p>
                </>
              ) : tab === "Build" ? (
                <div className="build-tools">
                  {[
                    {
                      id: "select",
                      name: "Select & edit",
                      icon: MousePointer2,
                    },
                    { id: "pan", name: "Pan canvas", icon: Hand },
                    { id: "room", name: "Rectangular room", icon: Square },
                    { id: "polygon", name: "Custom polygon room", icon: Home },
                    { id: "curve", name: "Draw curved wall", icon: Home },
                    { id: "wall", name: "Draw connected walls", icon: Home },
                    { id: "door", name: "Add door", icon: Box },
                    { id: "window", name: "Add window", icon: Grid2X2 },
                    { id: "measure", name: "Measure distance", icon: Ruler },
                    { id: "erase", name: "Erase object", icon: Trash2 },
                  ].map((t) => (
                    <button
                      className={s.tool === t.id ? "active" : ""}
                      key={t.id}
                      onClick={() =>
                        useEditor.setState({ tool: t.id, view: "2d" })
                      }
                    >
                      <t.icon size={19} />
                      {t.name}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                  <p>
                    Room and wall tools: click a start point, then an end point.
                    Select walls to move their endpoints.
                  </p>
                  <ExteriorTools />
                  <h3>Outdoor surfaces</h3>
                  {surfaceKinds.map((kind) => (
                    <button
                      key={kind}
                      className={s.tool === `surface:${kind}` ? "active" : ""}
                      onClick={() => {
                        useEditor.setState({
                          tool: `surface:${kind}`,
                          view: "2d",
                        });
                        setSidebar(false);
                      }}
                    >
                      Draw {kind}
                    </button>
                  ))}
                  <p>
                    Tap two opposite corners. Edit size, elevation, and terrain
                    slope in Properties.
                  </p>
                </div>
              ) : tab === "Materials" ? (
                <MaterialPicker />
              ) : tab === "Costs" ? (
                <CostBreakdown project={p} />
              ) : (
                <div className="property-body">
                  <label>
                    Lighting mood
                    <select
                      value={p.lighting.night ? "night" : "day"}
                      onChange={(e) =>
                        s.edit((p) => {
                          p.lighting.night = e.target.value === "night";
                        })
                      }
                    >
                      <option value="day">Daylight</option>
                      <option value="night">Evening</option>
                    </select>
                  </label>
                  <label>
                    Sun direction · {p.lighting.sun}°
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={p.lighting.sun}
                      onChange={(e) =>
                        s.edit((p) => {
                          p.lighting.sun = +e.target.value;
                        })
                      }
                    />
                  </label>
                  <button className="secondary" onClick={() => s.add("lamp")}>
                    <Plus size={16} />
                    Add floor lamp
                  </button>
                  <h3>Lights on this floor</h3>
                  {p.furniture
                    .filter((o) => o.kind === "lamp")
                    .map((o) => (
                      <LightControls key={o.id} lamp={o} />
                    ))}
                  {!p.furniture.some((o) => o.kind === "lamp") && (
                    <p>Add a lamp to control its brightness and color.</p>
                  )}
                </div>
              )}
            </aside>
            <section className="workspace">
              <div className="workspace-top">
                <FloorControls />
                <span className="area-badge">
                  {p.rooms.reduce((a, r) => a + area(r.points), 0).toFixed(1)}{" "}
                  m²
                </span>
              </div>
              <div className="canvas-views">
                {s.view !== "3d" && (
                  <div className="canvas-view">
                    <FloorPlan key={p.activeFloor?.id ?? "ground"} />
                  </div>
                )}
                {s.view !== "2d" && (
                  <div className="canvas-view">
                    <Scene
                      key={p.activeFloor?.id ?? "ground"}
                      preset={preset}
                      walk={walk}
                      quality={quality}
                      ceiling={ceiling}
                    />
                  </div>
                )}
              </div>
              <div className="floating-tools">
                {[
                  { tool: "select", icon: MousePointer2, label: "Select" },
                  { tool: "pan", icon: Hand, label: "Pan" },
                  { tool: "room", icon: Square, label: "Draw room" },
                  { tool: "measure", icon: Ruler, label: "Measure" },
                ].map((t) => (
                  <button
                    aria-label={t.label}
                    aria-pressed={s.tool === t.tool}
                    title={t.label}
                    key={t.tool}
                    className={s.tool === t.tool ? "active" : ""}
                    onClick={() =>
                      useEditor.setState({
                        tool: t.tool,
                        ...(t.tool !== "select" ? { view: "2d" as const } : {}),
                      })
                    }
                  >
                    <t.icon size={19} />
                  </button>
                ))}
              </div>
              <div className="view-bottom">
                <span className="view-label">
                  <span />
                  {s.view === "2d" ? "FLOOR PLAN" : "LIVE 3D VIEW"}
                </span>
                <div className="row">
                  <button
                    aria-label="Presentation mode"
                    title="Presentation mode"
                    onClick={() => setPresentation(!presentation)}
                  >
                    <Maximize size={16} />
                  </button>
                  <button
                    className={walk ? "active" : ""}
                    onClick={() => {
                      setWalk(!walk);
                      useEditor.setState({ view: "3d" });
                      if (!walk)
                        toast.info(
                          "Drag the scene to look. Use WASD, arrow keys, or the movement pad. Escape exits.",
                        );
                    }}
                  >
                    <Video size={16} />
                    {walk ? "Exit walkthrough" : "Walkthrough"}
                  </button>
                </div>
              </div>
              {walk && (
                <div className="walk-help">
                  Drag to look | WASD / arrows to move | Q / E to turn | Esc to
                  exit
                </div>
              )}
            </section>
            <aside
              className={`properties ${s.selected.length ? "has-selection" : ""} ${propertiesCollapsed ? "is-collapsed" : ""}`}
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">MAKE IT YOURS</p>
                  <h2>
                    {obj
                      ? "Object properties"
                      : wall
                        ? "Wall properties"
                        : room
                          ? "Room properties"
                          : opening
                            ? "Opening properties"
                            : surface
                              ? "Surface properties"
                              : "Your design"}
                  </h2>
                </div>
                {s.selected.length ? (
                  <button
                    title={
                      propertiesCollapsed
                        ? "Expand properties"
                        : "Collapse properties"
                    }
                    aria-expanded={!propertiesCollapsed}
                    onClick={() => setPropertiesCollapsed((v) => !v)}
                  >
                    <ChevronDown
                      size={17}
                      style={{
                        transform: propertiesCollapsed
                          ? "rotate(180deg)"
                          : undefined,
                      }}
                    />
                  </button>
                ) : (
                  <Settings2 size={17} />
                )}
              </div>
              <div className="property-body">
                <label>
                  Select object
                  <select
                    aria-label="Properties object selector"
                    value={s.selected[0] ?? ""}
                    onChange={(e) => s.select(e.target.value)}
                  >
                    <option value="">Project overview</option>
                    {[
                      ...p.rooms,
                      ...p.walls,
                      ...p.openings,
                      ...p.furniture,
                      ...p.surfaces,
                    ].map((o, i) => (
                      <option key={o.id} value={o.id}>
                        {"name" in o ? o.name : "kind" in o ? o.kind : "Wall"} (
                        {i + 1})
                      </option>
                    ))}
                  </select>
                </label>
                <DesignChecks />
                {obj ? (
                  <>
                    <div className="selected-card">
                      <FurnitureIcon kind={obj.kind} />
                      <div>
                        <strong>{obj.name}</strong>
                        <small>
                          {obj.kind} ·{" "}
                          {obj.model ? "Imported model" : "Procedural model"}
                        </small>
                      </div>
                    </div>
                    {obj.model && (
                      <p>
                        License: {obj.model.license}
                        <br />
                        {obj.model.attribution}
                      </p>
                    )}
                    <label>
                      Name
                      <input
                        value={obj.name}
                        onChange={(e) =>
                          s.patch(obj.id, { name: e.target.value })
                        }
                      />
                    </label>
                    <h3>
                      Transform <span>METERS</span>
                    </h3>
                    <div className="view-switch">
                      {(["translate", "rotate", "scale"] as const).map(
                        (mode) => (
                          <button
                            key={mode}
                            className={s.transformMode === mode ? "active" : ""}
                            onClick={() =>
                              useEditor.setState({ transformMode: mode })
                            }
                          >
                            {mode === "translate"
                              ? "Move"
                              : mode === "rotate"
                                ? "Rotate"
                                : "Scale"}
                          </button>
                        ),
                      )}
                    </div>
                    <div className="field-grid">
                      {(
                        [
                          "x",
                          "z",
                          "width",
                          "depth",
                          "height",
                          "rotation",
                        ] as const
                      ).map((k) => (
                        <label key={k}>
                          {k === "x"
                            ? "Position X"
                            : k === "z"
                              ? "Position Z"
                              : k[0].toUpperCase() + k.slice(1)}
                          <input
                            type="number"
                            step={k === "rotation" ? 15 : 0.1}
                            min={
                              ["width", "depth", "height"].includes(k)
                                ? 0.1
                                : undefined
                            }
                            max={
                              k === "height"
                                ? 5
                                : ["width", "depth"].includes(k)
                                  ? 10
                                  : undefined
                            }
                            value={Number(obj[k].toFixed(2))}
                            disabled={obj.locked}
                            onChange={(e) => {
                              const value = +e.target.value;
                              if (
                                Number.isFinite(value) &&
                                (!["width", "depth", "height"].includes(k) ||
                                  (value >= 0.1 &&
                                    value <= (k === "height" ? 5 : 10)))
                              )
                                s.patch(obj.id, { [k]: value });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      className="secondary"
                      onClick={() => s.patch(obj.id, { x: 3.5, z: 2.5 })}
                    >
                      Center in starter room
                    </button>
                    {overlapWarning && (
                      <p className="warning">
                        This object overlaps another piece. Check clearance
                        before placing.
                      </p>
                    )}
                    {wallWarning && (
                      <p className="warning">
                        This object crosses a wall. Adjust its position to keep
                        the floor plan clear.
                      </p>
                    )}
                    {obj.kind === "stairs" && (
                      <p>
                        Set Height to the difference between floor elevations.
                        Stairs are a visual model; use the floor selector to
                        move upstairs.
                      </p>
                    )}
                    {obj.kind === "lamp" && tab !== "Lighting" && (
                      <LightControls lamp={obj} />
                    )}
                    <h3>Material & finish</h3>
                    <label className="color-field">
                      Color
                      <input
                        type="color"
                        aria-label="Color"
                        value={obj.material.color}
                        onChange={(e) =>
                          s.patch(obj.id, {
                            material: {
                              ...obj.material,
                              color: e.target.value,
                            },
                          })
                        }
                      />
                      <span>{obj.material.color}</span>
                    </label>
                    {(["roughness", "metalness"] as const).map((k) => (
                      <label key={k}>
                        {k}
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".05"
                          value={obj.material[k]}
                          onChange={(e) =>
                            s.patch(obj.id, {
                              material: {
                                ...obj.material,
                                [k]: +e.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                    <h3>Budget estimate</h3>
                    <label>
                      Your estimated price
                      <input
                        type="number"
                        min="0"
                        value={obj.price}
                        onChange={(e) =>
                          s.patch(obj.id, {
                            price: Math.max(0, +e.target.value),
                          })
                        }
                      />
                    </label>
                    <div className="row">
                      <button className="secondary" onClick={s.duplicate}>
                        <Copy size={14} />
                        Duplicate
                      </button>
                      <button
                        className="secondary"
                        onClick={() => s.patch(obj.id, { locked: !obj.locked })}
                      >
                        {obj.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button
                        className="danger"
                        aria-label="Delete selected"
                        title="Delete selected"
                        onClick={s.remove}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : wall ? (
                  <>
                    <CurveWallControls key={wall.id} id={wall.id} />
                    <h3>Wall dimensions</h3>
                    <p>
                      Dimensions are in meters. Move either endpoint to change
                      the length or angle; connected walls follow.
                    </p>
                    {(["a", "b"] as const).map((end) =>
                      (["x", "z"] as const).map((axis) => (
                        <label key={`${end}${axis}`}>
                          {end === "a" ? "Start" : "End"} {axis.toUpperCase()}{" "}
                          (m)
                          <input
                            type="number"
                            step="0.1"
                            min="-100"
                            max="100"
                            value={wall[end][axis]}
                            onChange={(e) => {
                              if (e.target.value !== "")
                                s.edit((p) =>
                                  moveWallEndpoint(p, wall.id, end, {
                                    ...wall[end],
                                    [axis]: Number(e.target.value),
                                  }),
                                );
                            }}
                          />
                        </label>
                      )),
                    )}
                    <div className="row">
                      {(["window", "door"] as const).map((kind) => (
                        <button
                          key={kind}
                          className="secondary"
                          onClick={() => {
                            setTab("Build");
                            useEditor.setState({ tool: kind, view: "2d" });
                          }}
                        >
                          Add {kind}
                        </button>
                      ))}
                    </div>
                    <p>
                      Choose Add window or Add door, then click its position on
                      a wall.
                    </p>
                    {(["height", "thickness"] as const).map((k) => (
                      <label key={k}>
                        {k}
                        <input
                          type="number"
                          min={k === "height" ? 0.5 : 0.05}
                          max={k === "height" ? 6 : 1}
                          step=".05"
                          value={wall[k]}
                          onChange={(e) => {
                            const n = +e.target.value;
                            if (
                              n >= (k === "height" ? 0.5 : 0.05) &&
                              n <= (k === "height" ? 6 : 1)
                            )
                              s.edit((p) => {
                                p.walls.find((w) => w.id === wall.id)![k] = n;
                              });
                          }}
                        />
                      </label>
                    ))}
                    <label>
                      Paint
                      <input
                        type="color"
                        value={wall.material.color}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.walls.find(
                              (w) => w.id === wall.id,
                            )!.material.color = e.target.value;
                          })
                        }
                      />
                    </label>
                    <button className="danger" onClick={s.remove}>
                      <Trash2 size={16} />
                      Delete wall
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        try {
                          s.edit((p) => splitWall(p, wall.id));
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      Split wall at midpoint
                    </button>
                  </>
                ) : room ? (
                  <>
                    <RoomCorners room={room} />
                    <label>
                      Room name
                      <input
                        value={room.name}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.rooms.find((r) => r.id === room.id)!.name =
                              e.target.value;
                          })
                        }
                      />
                    </label>
                    <p>Floor area: {area(room.points).toFixed(2)} m²</p>
                    <button
                      className="secondary"
                      onClick={() =>
                        s.edit((p) => {
                          const r = p.rooms.find((r) => r.id === room.id)!;
                          r.visible = !r.visible;
                        })
                      }
                    >
                      {room.visible ? "Hide room" : "Show room"}
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete ${room.name} and its furniture? Shared walls will be preserved.`,
                          )
                        ) {
                          s.edit((p) => deleteRoom(p, room.id));
                          s.select("");
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      Delete room
                    </button>
                    <label>
                      Room type
                      <select
                        value={room.type}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.rooms.find((r) => r.id === room.id)!.type = e
                              .target.value as typeof room.type;
                          })
                        }
                      >
                        {[
                          "other",
                          "living",
                          "bedroom",
                          "kitchen",
                          "bathroom",
                          "office",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <div className="field-grid">
                      {["width", "depth"].map((k) => {
                        const width =
                            Math.max(...room.points.map((q) => q.x)) -
                            Math.min(...room.points.map((q) => q.x)),
                          depth =
                            Math.max(...room.points.map((q) => q.z)) -
                            Math.min(...room.points.map((q) => q.z));
                        return (
                          <label key={k}>
                            Room {k}
                            <input
                              type="number"
                              min="1"
                              max="30"
                              step=".1"
                              value={
                                +(k === "width" ? width : depth).toFixed(2)
                              }
                              onChange={(e) => {
                                const n = +e.target.value;
                                if (n >= 1 && n <= 30)
                                  s.edit((p) =>
                                    resizeRoom(
                                      p,
                                      room.id,
                                      k === "width" ? n : width,
                                      k === "depth" ? n : depth,
                                    ),
                                  );
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <label>
                      Floor material
                      <select
                        value={room.material.texture}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.rooms.find(
                              (r) => r.id === room.id,
                            )!.material.texture = e.target
                              .value as typeof room.material.texture;
                          })
                        }
                      >
                        {["solid", "wood", "tile", "concrete", "carpet"].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Texture scale
                      <input
                        type="range"
                        min=".1"
                        max="5"
                        step=".1"
                        value={room.material.textureScale}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.rooms.find(
                              (r) => r.id === room.id,
                            )!.material.textureScale = +e.target.value;
                          })
                        }
                      />
                    </label>
                    <label>
                      Texture rotation
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={room.material.textureRotation}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.rooms.find(
                              (r) => r.id === room.id,
                            )!.material.textureRotation = +e.target.value;
                          })
                        }
                      />
                    </label>
                    <label>
                      Floor finish
                      <input
                        type="color"
                        value={room.material.color}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.rooms.find(
                              (r) => r.id === room.id,
                            )!.material.color = e.target.value;
                          })
                        }
                      />
                    </label>
                    <p>
                      Edit connected wall endpoints in 2D to reshape this room.
                    </p>
                  </>
                ) : surface ? (
                  <>
                    <h3>{surface.name}</h3>
                    <ExteriorProperties surface={surface} />
                    <label>
                      Surface name
                      <input
                        value={surface.name}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.surfaces.find((v) => v.id === surface.id)!.name =
                              e.target.value;
                          })
                        }
                      />
                    </label>
                    {(
                      [
                        "x",
                        "z",
                        "width",
                        "depth",
                        "elevation",
                        "rotation",
                        ...(surface.kind === "terrain"
                          ? ["slope" as const]
                          : []),
                      ] as const
                    ).map((key) => (
                      <label key={key}>
                        {key === "slope"
                          ? "Slope rise (m)"
                          : `${key} ${key === "rotation" ? "(degrees)" : "(m)"}`}
                        <input
                          type="number"
                          step={key === "rotation" ? 15 : 0.1}
                          value={surface[key]}
                          onChange={(e) => {
                            if (e.target.value !== "")
                              s.edit((p) => {
                                p.surfaces.find((v) => v.id === surface.id)![
                                  key
                                ] = Number(e.target.value);
                              });
                          }}
                        />
                      </label>
                    ))}
                    <label>
                      Surface color
                      <input
                        type="color"
                        value={surface.color}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.surfaces.find((v) => v.id === surface.id)!.color =
                              e.target.value;
                          })
                        }
                      />
                    </label>
                    <button className="danger" onClick={s.remove}>
                      Delete surface
                    </button>
                  </>
                ) : opening ? (
                  <>
                    <h3>
                      {opening.kind === "window" ? "Window" : "Door"} dimensions
                    </h3>
                    <label>
                      Opening style
                      <select
                        value={opening.style ?? "classic"}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.openings.find((o) => o.id === opening.id)!.style =
                              e.target.value as
                                "classic" | "sliding" | "double";
                          })
                        }
                      >
                        <option value="classic">Classic</option>
                        <option value="sliding">Sliding</option>
                        <option value="double">Double</option>
                      </select>
                    </label>
                    <p>
                      Drag the opening along its wall, or use Move, Width, and
                      Height handles. Blue labels show clearances.
                    </p>
                    {(["width", "height", "sill", "offset"] as const).map(
                      (key) => (
                        <label key={key}>
                          {key === "offset"
                            ? "Position along wall (%)"
                            : `${key} (m)`}
                          <input
                            type="number"
                            step={key === "offset" ? 1 : 0.1}
                            min={key === "width" || key === "height" ? 0.3 : 0}
                            max={
                              key === "offset"
                                ? 100
                                : key === "width"
                                  ? 4
                                  : key === "height"
                                    ? 3
                                    : 2
                            }
                            value={
                              key === "offset"
                                ? Math.round(opening.offset * 10000) / 100
                                : opening[key]
                            }
                            onChange={(e) => {
                              if (e.target.value !== "")
                                s.edit((p) => {
                                  p.openings.find((o) => o.id === opening.id)![
                                    key
                                  ] =
                                    Number(e.target.value) /
                                    (key === "offset" ? 100 : 1);
                                });
                            }}
                          />
                        </label>
                      ),
                    )}
                    <p>Openings must fit within the wall and cannot overlap.</p>
                    <p>
                      {opening.kind} · {opening.width} m × {opening.height} m
                    </p>
                    <button className="danger" onClick={s.remove}>
                      Delete opening
                    </button>
                  </>
                ) : (
                  <>
                    <div className="design-summary">
                      <div className="summary-icon">
                        <Home size={32} />
                      </div>
                      <h3>A space to call your own.</h3>
                      <p>
                        Select a piece in your design to adjust its dimensions,
                        finish, and position.
                      </p>
                    </div>
                    <h3>Project overview</h3>
                    <div className="stat">
                      <span>Total floor area</span>
                      <strong>
                        {p.rooms
                          .reduce((a, r) => a + area(r.points), 0)
                          .toFixed(1)}{" "}
                        m²
                      </strong>
                    </div>
                    <div className="stat">
                      <span>Rooms</span>
                      <strong>{p.rooms.length}</strong>
                    </div>
                    <div className="stat">
                      <span>Furniture pieces</span>
                      <strong>{p.furniture.length}</strong>
                    </div>
                    <div className="stat">
                      <span>Current floor budget</span>
                      <strong>
                        {p.furniture
                          .reduce((a, o) => a + o.price, 0)
                          .toLocaleString()}
                      </strong>
                    </div>
                    <h3>Rooms</h3>
                    <label>
                      Walkthrough speed · {p.camera.speed} m/s
                      <input
                        type="range"
                        min=".5"
                        max="5"
                        step=".25"
                        value={p.camera.speed}
                        onChange={(e) =>
                          s.edit((p) => {
                            p.camera.speed = +e.target.value;
                          })
                        }
                      />
                    </label>
                    {p.rooms.map((r) => (
                      <button
                        className="room-row"
                        key={r.id}
                        onClick={() => s.select(r.id)}
                      >
                        <Square size={15} />
                        {r.name}
                        <span>{area(r.points).toFixed(1)} m²</span>
                      </button>
                    ))}
                    <div className="design-note">
                      <Leaf size={18} />
                      <p>
                        Make room to breathe.
                        <br />
                        <span>
                          Leave space between pieces for a comfortable flow.
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
          <div className="bottom-bar">
            <div className="row">
              <button
                className={s.grid ? "active" : ""}
                onClick={() => useEditor.setState({ grid: !s.grid })}
              >
                <Grid2X2 size={14} />
                Grid
              </button>
              <button
                className={s.snapping ? "active" : ""}
                onClick={() => useEditor.setState({ snapping: !s.snapping })}
              >
                Snap to grid <span className="toggle-dot" />
              </button>
              <select
                aria-label="Measurement units"
                value={p.units}
                onChange={(e) =>
                  s.edit((p) => {
                    p.units = e.target.value as Project["units"];
                  })
                }
              >
                {["m", "cm", "ft", "in"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <select
                aria-label="Grid spacing"
                value={s.gridStep}
                onChange={(e) =>
                  useEditor.setState({ gridStep: +e.target.value })
                }
              >
                {[0.05, 0.1, 0.25, 0.5, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} m grid
                  </option>
                ))}
              </select>
            </div>
            <span className="bottom-tip">
              {s.view === "2d"
                ? "Every detail, in the right place."
                : "Orbit: drag · Pan: right-drag · Zoom: scroll"}
            </span>
            <div className="row">
              <label>
                <input
                  type="checkbox"
                  checked={ceiling}
                  onChange={(e) => setCeiling(e.target.checked)}
                />
                Ceiling
              </label>
              <select
                aria-label="Camera preset"
                value={preset}
                onChange={(e) =>
                  s.edit((p) => {
                    p.camera.preset = e.target
                      .value as Project["camera"]["preset"];
                  })
                }
              >
                {["Isometric", "Top", "Front", "Back", "Left", "Right"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
              <select
                aria-label="Rendering quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                {["Low", "Medium", "High"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          {presentation && (
            <button
              className="exit-presentation"
              onClick={() => setPresentation(false)}
            >
              <X size={17} />
              Exit presentation
            </button>
          )}
        </>
      )}
      {sharing && p && (
        <CloudPanel close={() => setSharing(false)} save={save} />
      )}
      {auth && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            tabIndex={-1}
          >
            <button
              className="modal-close"
              aria-label="Close account"
              onClick={() => setAuth(false)}
            >
              <X />
            </button>
            <BrandLogo large />
            <h2>Your account</h2>
            <p>{user}</p>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await save();
                  const result = await supabase?.auth.signOut();
                  if (result?.error) throw result.error;
                  setAuth(false);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
