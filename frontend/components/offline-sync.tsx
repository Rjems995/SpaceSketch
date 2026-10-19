"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { supabase, syncCloud } from "@/lib/supabase";
import {
  drainQueue,
  enqueueSave,
  pendingSaves,
  removePending,
  type PendingSave,
} from "@/lib/sync-queue";
import { cacheCloudRevision, saveLocal } from "@/lib/storage";
import { useEditor } from "@/stores/editor";
export async function currentAccount() {
  return (await supabase?.auth.getSession())?.data.session?.user.id ?? null;
}
export async function syncPending(account: string) {
  return drainQueue(account, syncCloud, currentAccount, (result, sent) => {
    cacheCloudRevision(result);
    const active = useEditor.getState().project;
    if (active?.id === result.id)
      useEditor.setState({
        project: { ...active, cloudRevision: result.cloudRevision },
        status:
          active.revision === sent.revision &&
          active.updatedAt === sent.updatedAt &&
          !pendingSaves(account).some((e) => e.project.id === active.id)
            ? "Saved to cloud"
            : "Unsaved changes",
      });
  });
}
export default function OfflineSync() {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [entries, setEntries] = useState<PendingSave[]>([]);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setAccount(session?.user.id ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let running = false,
      disposed = false;
    const refresh = () => {
      setOnline(navigator.onLine);
      setEntries(account ? pendingSaves(account) : []);
    };
    const sync = async () => {
      refresh();
      if (!account || running) return;
      running = true;
      try {
        await syncPending(account);
      } catch (e) {
        if (!disposed) toast.error((e as Error).message);
      } finally {
        running = false;
        if (!disposed) refresh();
      }
    };
    void sync();
    const timer = setInterval(sync, 15000);
    window.addEventListener("online", sync);
    window.addEventListener("offline", refresh);
    window.addEventListener("spacesketch-sync", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("spacesketch-sync-now", sync);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("spacesketch-sync", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("spacesketch-sync-now", sync);
    };
  }, [account]);
  if (!account || !entries.length) return null;
  return (
    <aside className="sync-notice" aria-label="Cloud sync">
      <p role="status">
        {online
          ? "Cloud saves pending"
          : "Offline: changes saved on this device"}{" "}
        ({entries.length})
      </p>
      <button
        onClick={() => window.dispatchEvent(new Event("spacesketch-sync-now"))}
      >
        Retry sync
      </button>
      {entries
        .filter((e) => e.error)
        .map((entry) => (
          <div key={entry.project.id}>
            <strong>{entry.project.name}: sync needs attention</strong>
            <p>
              {entry.error}. Your offline copy is preserved. Save it separately,
              then load cloud projects to open the remote version.
            </p>
            <button
              onClick={() => {
                try {
                  const active = useEditor.getState().project;
                  const copy = saveLocal({
                    ...(active?.id === entry.project.id
                      ? active
                      : entry.project),
                    id: crypto.randomUUID(),
                    name: (entry.project.name + " (offline copy)").slice(
                      0,
                      100,
                    ),
                    revision: 0,
                    cloudRevision: 0,
                  });
                  enqueueSave(account, copy);
                  removePending(account, entry.project.id);
                  if (active?.id === entry.project.id) {
                    useEditor.getState().load(copy);
                    router.push("/editor/" + copy.id);
                  } else
                    window.dispatchEvent(new Event("spacesketch-sync-now"));
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Keep offline work as separate project
            </button>
          </div>
        ))}
    </aside>
  );
}
