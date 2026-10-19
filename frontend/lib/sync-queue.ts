import { Project, projectSchema } from "./model";
export type PendingSave = { project: Project; token: string; error?: string };
const key = (account: string) => "spacesketch-sync-v1:" + account;
export function pendingSaves(account: string): PendingSave[] {
  return JSON.parse(localStorage.getItem(key(account)) ?? "[]").map(
    (entry: PendingSave) => ({
      ...entry,
      project: projectSchema.parse(entry.project),
    }),
  );
}
function write(account: string, entries: PendingSave[]) {
  localStorage.setItem(key(account), JSON.stringify(entries));
  window.dispatchEvent(new Event("spacesketch-sync"));
}
export function enqueueSave(account: string, project: Project) {
  const entries = pendingSaves(account),
    old = entries.find((e) => e.project.id === project.id);
  write(account, [
    ...entries.filter((e) => e.project.id !== project.id),
    {
      project: {
        ...project,
        cloudRevision: old?.project.cloudRevision ?? project.cloudRevision,
      },
      token: crypto.randomUUID(),
      error: old?.error,
    },
  ]);
}
export function removePending(account: string, id: string) {
  write(
    account,
    pendingSaves(account).filter((e) => e.project.id !== id),
  );
}
export async function drainQueue(
  account: string,
  send: (p: Project) => Promise<Project | undefined>,
  activeAccount: () => Promise<string | null>,
  saved: (p: Project, sent: Project) => void,
) {
  const run = async () => {
    for (const entry of pendingSaves(account)) {
      if (
        entry.error ||
        !navigator.onLine ||
        (await activeAccount()) !== account
      )
        continue;
      try {
        const result = await send(entry.project);
        if (!result || (await activeAccount()) !== account) return;
        const entries = pendingSaves(account),
          latest = entries.find((e) => e.project.id === entry.project.id);
        write(
          account,
          entries.flatMap((e) =>
            e.project.id !== entry.project.id
              ? [e]
              : e.token === entry.token
                ? []
                : [
                    {
                      ...e,
                      project: {
                        ...e.project,
                        cloudRevision: result.cloudRevision,
                      },
                    },
                  ],
          ),
        );
        saved(result, latest?.project ?? entry.project);
      } catch (error) {
        const message =
          (error as { message?: string }).message ?? "Cloud save failed";
        // Network failures remain retryable; server rejections require an explicit decision.
        if (
          !navigator.onLine ||
          /fetch|network|timeout|connection/i.test(message)
        )
          return;
        write(
          account,
          pendingSaves(account).map((e) =>
            e.project.id === entry.project.id ? { ...e, error: message } : e,
          ),
        );
      }
    }
  };
  if (navigator.locks)
    await navigator.locks.request("spacesketch-sync:" + account, run);
  else await run();
}
