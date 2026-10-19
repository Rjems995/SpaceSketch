import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { template } from "@/lib/model";
import { drainQueue, enqueueSave, pendingSaves } from "@/lib/sync-queue";
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
  });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  vi.stubGlobal("navigator", { onLine: true });
});
afterEach(() => vi.unstubAllGlobals());
it("persists the latest offline edits per project without crossing accounts", async () => {
  const p = template("Empty Room");
  enqueueSave("A", p);
  enqueueSave("A", { ...p, name: "Latest" });
  navigator.onLine;
  vi.stubGlobal("navigator", { onLine: false });
  const send = vi.fn();
  await drainQueue("A", send, async () => "A", vi.fn());
  expect(send).not.toHaveBeenCalled();
  expect(pendingSaves("A")[0].project.name).toBe("Latest");
  expect(pendingSaves("B")).toEqual([]);
  vi.stubGlobal("navigator", { onLine: true });
  await drainQueue("A", send, async () => "B", vi.fn());
  expect(send).not.toHaveBeenCalled();
});
it("reconnect uploads and clears only acknowledged snapshots", async () => {
  const p = template("Empty Room");
  enqueueSave("A", p);
  await drainQueue(
    "A",
    async (sent) => {
      enqueueSave("A", { ...p, name: "Edited during upload" });
      return { ...sent, cloudRevision: 1 };
    },
    async () => "A",
    vi.fn(),
  );
  expect(pendingSaves("A")[0].project.name).toBe("Edited during upload");
  expect(pendingSaves("A")[0].project.cloudRevision).toBe(1);
  await drainQueue(
    "A",
    async (sent) => ({ ...sent, cloudRevision: 2 }),
    async () => "A",
    vi.fn(),
  );
  expect(pendingSaves("A")).toEqual([]);
});
it("preserves conflicts and never automatically overwrites the cloud", async () => {
  const p = template("Empty Room");
  enqueueSave("A", p);
  const send = vi.fn().mockRejectedValue({
    message: "Cloud version is newer. Reload cloud projects before saving.",
  });
  await drainQueue("A", send, async () => "A", vi.fn());
  enqueueSave("A", { ...p, name: "More local edits" });
  await drainQueue("A", send, async () => "A", vi.fn());
  expect(send).toHaveBeenCalledTimes(1);
  expect(pendingSaves("A")[0].error).toContain("newer");
});
it("network errors remain queued for retry", async () => {
  enqueueSave("A", template("Empty Room"));
  await drainQueue(
    "A",
    async () => {
      throw new Error("Failed to fetch");
    },
    async () => "A",
    vi.fn(),
  );
  expect(pendingSaves("A")).toHaveLength(1);
  expect(pendingSaves("A")[0].error).toBeUndefined();
});
