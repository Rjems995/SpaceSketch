import { beforeEach, expect, it, vi } from "vitest";
import {
  deleteLocal,
  listProjects,
  saveLocal,
  mergeCloudProjects,
  saveDraft,
  recoverDraft,
  clearDraft,
} from "../lib/storage";
import { template } from "../lib/model";
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  const session = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => session.set(k, v),
    removeItem: (k: string) => session.delete(k),
  });
});
it("recovers unsaved edits but never overwrites a newer save", () => {
  const p = saveLocal(template());
  saveDraft({ ...p, name: "Recovered room" });
  expect(recoverDraft()?.name).toBe("Recovered room");
  saveLocal(p);
  expect(recoverDraft()).toBeNull();
  clearDraft();
  expect(recoverDraft()).toBeNull();
});
it("keeps a recovery copy when importing a newer cloud revision", () => {
  let p = saveLocal(template());
  p = saveLocal(p);
  const cloud = { ...p, name: "Cloud copy", revision: 1, cloudRevision: 2 };
  const merged = mergeCloudProjects([cloud]);
  expect(merged).toHaveLength(2);
  expect(merged.find((x) => x.id === p.id)?.name).toBe("Cloud copy");
  expect(merged.find((x) => x.id !== p.id)?.name).toContain("local recovery");
});
it("saves and reloads geometry and materials exactly", () => {
  const saved = saveLocal(template());
  expect(listProjects()).toEqual([saved]);
  deleteLocal(saved.id);
  expect(listProjects()).toEqual([]);
});
it("rejects stale local writers", () => {
  const p = template();
  saveLocal(p);
  expect(() => saveLocal(p)).toThrow("newer version");
});
