import { Project, projectSchema } from "./model";
const KEY = "spacesketch-projects-v1";
const DRAFT = "spacesketch-draft-v1";
export function saveDraft(p: Project) {
  sessionStorage.setItem(DRAFT, JSON.stringify(p));
}
export function clearDraft() {
  sessionStorage.removeItem(DRAFT);
}
export function recoverDraft() {
  const raw = sessionStorage.getItem(DRAFT);
  if (!raw) return null;
  const parsed = projectSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return null;
  const p = parsed.data,
    stored = listProjects().find((old) => old.id === p.id);
  if (stored && stored.revision > p.revision) return null;
  return p;
}
export function listProjects(): Project[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  return JSON.parse(raw).map((p: unknown) => projectSchema.parse(p));
}
export function saveLocal(p: Project) {
  const list = listProjects();
  const old = list.find((x) => x.id === p.id);
  if (old && old.revision > p.revision)
    throw new Error(
      "A newer version exists. Reopen the project before saving.",
    );
  const next = { ...p, revision: p.revision + 1 };
  localStorage.setItem(
    KEY,
    JSON.stringify([next, ...list.filter((x) => x.id !== p.id)]),
  );
  return next;
}
export function cacheCloudRevision(p: Project) {
  const list = listProjects();
  localStorage.setItem(
    KEY,
    JSON.stringify(
      list.map((old) =>
        old.id === p.id ? { ...old, cloudRevision: p.cloudRevision } : old,
      ),
    ),
  );
}
export function deleteLocal(id: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(listProjects().filter((p) => p.id !== id)),
  );
}
export function mergeCloudProjects(incoming: Project[]) {
  const local = listProjects();
  for (const p of incoming) {
    const i = local.findIndex((old) => old.id === p.id);
    if (i < 0) {
      local.push(p);
      continue;
    }
    const old = local[i];
    if (p.cloudRevision > old.cloudRevision) {
      if (JSON.stringify(old) !== JSON.stringify(p))
        local.push({
          ...old,
          id: crypto.randomUUID(),
          name: `${old.name} (local recovery)`,
          revision: 0,
          cloudRevision: 0,
        });
      local[i] = p;
    }
  }
  localStorage.setItem(KEY, JSON.stringify(local));
  return local;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importProject(file: File) {
  if (file.size > 5_000_000)
    throw new Error("Project files must be smaller than 5 MB.");
  const p = projectSchema.parse(JSON.parse(await file.text()));
  return { ...p, id: crypto.randomUUID(), revision: 0, cloudRevision: 0 };
}
