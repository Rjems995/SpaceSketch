"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { catalog, Furniture, Project, template, surfaceKinds } from "@/lib/model";
import { area, corners, format, overlap, wallCorners } from "@/lib/geometry";
import { useEditor } from "@/stores/editor";
import {
  deleteLocal,
  download,
  importProject,
  listProjects,
  saveLocal,
} from "@/lib/storage";
import {
  supabase,
  syncCloud,
  cloudProjects,
  deleteCloudProject,
} from "@/lib/supabase";
import CloudPanel from "./cloud-panel";
import FurnitureIcon from "./furniture-icon";
import BrandLogo from "./brand-logo";
import type { PreviewImages } from "./furniture-previews";
import Image from "next/image";
const FurniturePreviews = dynamic(() => import("./furniture-previews"), { ssr: false });
import { resizeRoom, splitWall, deleteRoom, moveWallEndpoint } from "@/lib/rooms";
import {
  cacheCloudRevision,
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
];
export default function Studio({ projectId }: { projectId?: string } = {}) {
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
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [user, setUser] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const p = s.project;
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
        useEditor.setState({ status: "Syncing…" });
        const synced = await syncCloud(next);
        const active = useEditor.getState().project;
        if (synced) {
          cacheCloudRevision(synced);
          if (active?.id === synced.id)
            useEditor.setState({
              project: { ...active, cloudRevision: synced.cloudRevision },
              status: active === next ? "Saved to cloud" : "Unsaved changes",
            });
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
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
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
    setReady(false);
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
      else if (type === "pdf") {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(20);
        doc.text(p.name, 15, 18);
        doc.setFontSize(10);
        doc.text(
          `${p.rooms.reduce((a, r) => a + area(r.points), 0).toFixed(1)} m² · Exported ${new Date().toLocaleDateString()}`,
          15,
          26,
        );
        const pts = [...p.walls.flatMap((w) => [w.a, w.b]), ...p.surfaces.flatMap(o => corners(o))];
        const minX = Math.min(0, ...pts.map((q) => q.x)),
          minZ = Math.min(0, ...pts.map((q) => q.z)),
          maxX = Math.max(7, ...pts.map((q) => q.x)),
          maxZ = Math.max(5, ...pts.map((q) => q.z));
        const scale = Math.min(250 / (maxX - minX), 145 / (maxZ - minZ)),
          x = (v: number) => 20 + (v - minX) * scale,
          y = (v: number) => 45 + (v - minZ) * scale;
        p.surfaces.forEach(o => {
          const boundary = corners(o); doc.setDrawColor(o.color); doc.setLineWidth(0.5);
          boundary.forEach((q, i) => doc.line(x(q.x), y(q.z), x(boundary[(i + 1) % 4].x), y(boundary[(i + 1) % 4].z)));
          doc.setFontSize(8); doc.text(o.name, x(o.x), y(o.z));
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
        doc.save(`${p.name}.pdf`);
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
  const surface = p?.surfaces.find(o => o.id === s.selected[0]);
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
    <div className={`app ${presentation ? "presentation" : ""}`}>
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
                title="Undo (Ctrl+Z)"
                disabled={!s.past.length}
                onClick={s.undo}
              >
                <Undo2 size={17} />
              </button>
              <button
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
              <button title="Save project" onClick={save}>
                <Save size={18} />
              </button>
              <select
                aria-label="Export project"
                value=""
                onChange={(e) => void exported(e.target.value)}
              >
                <option value="" disabled>
                  Export ↗
                </option>
                <option value="json">JSON backup</option>
                <option value="pdf">PDF floor plan</option>
                <option value="png">PNG image</option>
                <option value="jpg">JPEG image</option>
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
          <span className="top-tagline">
            A little imagination. A space of your own.
          </span>
        )}
        <button
          className="avatar"
          title={user || "Account"}
          onClick={() => setAuth(true)}
        >
          {user ? user[0].toUpperCase() : "S"}
        </button>
      </header>
      {!p ? (
        <main className="dashboard">
          <div className="dash-heading">
            <div>
              <p className="eyebrow">YOUR PERSONAL DESIGN STUDIO</p>
              <h1>Room for possibilities.</h1>
              <p>Bring your next space to life, one idea at a time.</p>
            </div>
            <button className="primary" onClick={() => create("Empty Room")}>
              <Plus size={18} />
              New project
            </button>
          </div>
          <section className="hero">
            <div>
              <span className="pill">FROM A FRESH PERSPECTIVE</span>
              <h2>
                Your space.
                <br />
                Reimagined.
              </h2>
              <p>
                Start with a room. Make it feel like you.
                <br />
                Plan in 2D, explore in 3D, and find your perfect fit.
              </p>
              <button onClick={() => create("Living Room")}>
                Explore the living room template <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="hero-room" aria-hidden="true">
              <div className="art-wall">
                <i />
                <i />
                <i />
              </div>
              <div className="art-rug" />
              <div className="art-sofa">
                <i />
                <i />
                <i />
              </div>
              <div className="art-table" />
              <div className="art-plant">✦</div>
            </div>
          </section>
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
                      setProjects(mergeCloudProjects(cloud));
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
              .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
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
                    onClick={() => open(project)}
                  >
                    <svg viewBox="-1 -1 10 8">
                      {project.rooms.map((r) => (
                        <polygon
                          key={r.id}
                          points={r.points
                            .map((q) => `${q.x},${q.z}`)
                            .join(" ")}
                          fill={r.material.color}
                          opacity=".5"
                        />
                      ))}
                      {project.walls.map((w) => (
                        <line
                          key={w.id}
                          x1={w.a.x}
                          y1={w.a.z}
                          x2={w.b.x}
                          y2={w.b.z}
                          stroke="#6a655b"
                          strokeWidth=".12"
                        />
                      ))}
                      {project.furniture.map((o) => (
                        <rect
                          key={o.id}
                          x={o.x - o.width / 2}
                          y={o.z - o.depth / 2}
                          width={o.width}
                          height={o.depth}
                          rx=".06"
                          fill={o.material.color}
                          stroke="#82715b"
                          strokeWidth=".03"
                          transform={`rotate(${o.rotation} ${o.x} ${o.z})`}
                        />
                      ))}
                    </svg>
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
                                const synced = await syncCloud(renamed);
                                if (synced) cacheCloudRevision(synced);
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
              <h2>A starting point for every space</h2>
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
                      placeholder="Search the collection"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
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
                    <span>
                      {
                        catalog.filter(
                          (c) =>
                            (category === "All" || c.category === category) &&
                            c.name.toLowerCase().includes(query.toLowerCase()),
                        ).length
                      }
                    </span>
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
                    {catalog
                      .filter(
                        (c) =>
                          (category === "All" || c.category === category) &&
                          c.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((c) => (
                        <button
                          className="furniture-card"
                          key={c.kind}
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
                            {previews[c.kind] ? <Image src={previews[c.kind]!} alt={`${c.name} 3D preview`} width={256} height={192} unoptimized className="furniture-preview-image" draggable={false} /> : <FurnitureIcon kind={c.kind} />}
                          </div>
                          <strong>{c.name}</strong>
                          <span>
                            {c.size[0]} × {c.size[1]} m <Plus size={13} />
                          </span>
                        </button>
                      ))}
                  </div>
                  {category === "Outdoor" && <div className="build-tools"><h3>Outdoor surfaces</h3><p>Choose a surface, then tap two opposite corners in 2D.</p>{surfaceKinds.map(kind => <button key={kind} onClick={() => { useEditor.setState({ tool: `surface:${kind}`, view: "2d" }); setSidebar(false); }}>Draw {kind}</button>)}</div>}
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
                  <h3>Outdoor surfaces</h3>
                  {surfaceKinds.map(kind => <button key={kind} className={s.tool === `surface:${kind}` ? "active" : ""} onClick={() => { useEditor.setState({ tool: `surface:${kind}`, view: "2d" }); setSidebar(false); }}>Draw {kind}</button>)}
                  <p>Tap two opposite corners. Edit size, elevation, and terrain slope in Properties.</p>
                </div>
              ) : tab === "Materials" ? (
                <div className="material-library">
                  <p>
                    Select a room, wall, or furniture piece, then choose a
                    finish.
                  </p>
                  {[
                    "#e9e5da",
                    "#c6ae8d",
                    "#a9b39f",
                    "#c39880",
                    "#555952",
                    "#bfc1bd",
                    "#dcc9ae",
                    "#e8ded0",
                  ].map((color) => (
                    <button
                      key={color}
                      style={{ background: color }}
                      title={`Apply ${color}`}
                      onClick={() => {
                        if (!obj && !wall && !room) {
                          toast.info(
                            "Select a room, wall, or furniture first.",
                          );
                          return;
                        }
                        s.edit((p) => {
                          const target = [
                            ...p.furniture,
                            ...p.walls,
                            ...p.rooms,
                          ].find((o) => o.id === s.selected[0]);
                          if (target) target.material.color = color;
                        });
                      }}
                    />
                  ))}
                </div>
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
                </div>
              )}
            </aside>
            <section className="workspace">
              <div className="workspace-top">
                <div className="breadcrumb">
                  <Home size={14} />
                  <span>{p.rooms[0]?.name || "Floor plan"}</span>
                  <ChevronDown size={13} />
                </div>
                <span className="area-badge">
                  {p.rooms.reduce((a, r) => a + area(r.points), 0).toFixed(1)}{" "}
                  m²
                </span>
              </div>
              <div className="canvas-views">
                {s.view !== "3d" && (
                  <div className="canvas-view">
                    <FloorPlan />
                  </div>
                )}
                {s.view !== "2d" && (
                  <div className="canvas-view">
                    <Scene
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
                          "Click the scene to look around. WASD to walk; Escape to release the mouse.",
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
                  Click the scene · WASD to move · Mouse to look · Esc to
                  release
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
                            : surface ? "Surface properties" : "Your design"}
                  </h2>
                </div>
                {s.selected.length ? (
                  <button title={propertiesCollapsed ? "Expand properties" : "Collapse properties"} aria-expanded={!propertiesCollapsed} onClick={() => setPropertiesCollapsed(v => !v)}>
                    <ChevronDown size={17} style={{ transform: propertiesCollapsed ? "rotate(180deg)" : undefined }} />
                  </button>
                ) : (
                  <Settings2 size={17} />
                )}
              </div>
              <div className="property-body">
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
                        title="Delete selected"
                        onClick={s.remove}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : wall ? (
                  <>
                    <h3>Wall dimensions</h3>
                    <p>Dimensions are in meters. Move either endpoint to change the length or angle; connected walls follow.</p>
                    {(["a", "b"] as const).map(end => (["x", "z"] as const).map(axis => (
                      <label key={`${end}${axis}`}>
                        {end === "a" ? "Start" : "End"} {axis.toUpperCase()} (m)
                        <input type="number" step="0.1" min="-100" max="100" value={wall[end][axis]}
                          onChange={e => { if (e.target.value !== "") s.edit(p => moveWallEndpoint(p, wall.id, end, { ...wall[end], [axis]: Number(e.target.value) })); }} />
                      </label>
                    )))}
                    <div className="row">
                      {(["window", "door"] as const).map(kind => <button key={kind} className="secondary" onClick={() => { setTab("Build"); useEditor.setState({ tool: kind, view: "2d" }); }}>Add {kind}</button>)}
                    </div>
                    <p>Choose Add window or Add door, then click its position on a wall.</p>
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
                    <h3>{surface.kind} surface</h3>
                    <label>Surface name<input value={surface.name} onChange={e => s.edit(p => { p.surfaces.find(v => v.id === surface.id)!.name = e.target.value; })} /></label>
                    {(["x", "z", "width", "depth", "elevation", "rotation", ...(surface.kind === "terrain" ? ["slope" as const] : [])] as const).map(key => <label key={key}>{key === "slope" ? "Slope rise (m)" : `${key} ${key === "rotation" ? "(degrees)" : "(m)"}`}
                      <input type="number" step={key === "rotation" ? 15 : 0.1} value={surface[key]} onChange={e => { if (e.target.value !== "") s.edit(p => { p.surfaces.find(v => v.id === surface.id)![key] = Number(e.target.value); }); }} />
                    </label>)}
                    <label>Surface color<input type="color" value={surface.color} onChange={e => s.edit(p => { p.surfaces.find(v => v.id === surface.id)!.color = e.target.value; })} /></label>
                    <button className="danger" onClick={s.remove}>Delete surface</button>
                  </>
                ) : opening ? (
                  <>
                    <h3>{opening.kind === "window" ? "Window" : "Door"} dimensions</h3>
                    <label>Opening style<select value={opening.style ?? "classic"} onChange={e => s.edit(p => { p.openings.find(o => o.id === opening.id)!.style = e.target.value as "classic" | "sliding" | "double"; })}>
                      <option value="classic">Classic</option><option value="sliding">Sliding</option><option value="double">Double</option>
                    </select></label>
                    <p>Drag the opening along its wall, or use Move, Width, and Height handles. Blue labels show clearances.</p>
                    {(["width", "height", "sill", "offset"] as const).map(key => (
                      <label key={key}>
                        {key === "offset" ? "Position along wall (%)" : `${key} (m)`}
                        <input type="number" step={key === "offset" ? 1 : 0.1}
                          min={key === "width" || key === "height" ? 0.3 : 0}
                          max={key === "offset" ? 100 : key === "width" ? 4 : key === "height" ? 3 : 2}
                          value={key === "offset" ? Math.round(opening.offset * 10000) / 100 : opening[key]}
                          onChange={e => { if (e.target.value !== "") s.edit(p => { p.openings.find(o => o.id === opening.id)![key] = Number(e.target.value) / (key === "offset" ? 100 : 1); }); }} />
                      </label>
                    ))}
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
                      <span>User-entered budget</span>
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
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) return;
              setBusy(true);
              const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              setBusy(false);
              if (error) toast.error(error.message);
              else {
                setAuth(false);
                toast.success("Signed in");
              }
            }}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setAuth(false)}
            >
              <X />
            </button>
            <BrandLogo large />
            <h2>{user ? "Your account" : "Welcome to your studio"}</h2>
            {!supabase ? (
              <>
                <p>
                  You’re using local demo mode. Projects are saved in this
                  browser.
                </p>
                <p>
                  Configure the Supabase environment variables to enable
                  accounts and cloud storage. See README.md.
                </p>
              </>
            ) : user ? (
              <>
                <p>{user}</p>
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    await supabase!.auth.signOut();
                    setAuth(false);
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button disabled={busy} className="primary" type="submit">
                  {busy ? "Signing in…" : "Sign in"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    const { error } = await supabase!.auth.signUp({
                      email,
                      password,
                    });
                    error
                      ? toast.error(error.message)
                      : toast.success(
                          "Check your email to confirm your account.",
                        );
                  }}
                >
                  Create an account
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { error } =
                      await supabase!.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                    error
                      ? toast.error(error.message)
                      : toast.success("Password reset email sent.");
                  }}
                >
                  Send password reset email
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
