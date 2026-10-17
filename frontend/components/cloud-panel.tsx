"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Copy, Link, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import {
  createShare,
  revokeShares,
  projectVersions,
  supabase,
} from "@/lib/supabase";
import { useEditor } from "@/stores/editor";
import { projectSchema } from "@/lib/model";
export default function CloudPanel({
  close,
  save,
}: {
  close: () => void;
  save: () => Promise<void>;
}) {
  const p = useEditor((s) => s.project)!;
  const [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountId(session?.user.id ?? null);
      setUrl("");
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const {
    data: versions = [],
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["versions", accountId, p.id],
    queryFn: () => projectVersions(p.id),
    enabled: false,
  });
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Share your space"
        tabIndex={-1}
      >
        <button
          className="modal-close"
          onClick={close}
          aria-label="Close sharing"
        >
          <X />
        </button>
        <h2>Share your space</h2>
        <p>
          Read-only links show the latest cloud version. Anyone with the link
          can view the design until you revoke it.
        </p>
        {!supabase ? (
          <p>
            Cloud sharing requires Supabase configuration. Export a JSON backup
            to share an editable copy in local mode.
          </p>
        ) : (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { data } = await supabase!.auth.getUser();
                  if (!data.user)
                    throw new Error("Sign in using the account button first.");
                  await save();
                  if (useEditor.getState().status !== "Saved to cloud")
                    throw new Error(
                      "Save the project to cloud successfully before creating a link.",
                    );
                  setUrl(await createShare(p.id));
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Link size={16} />
              Create read-only link
            </button>
            {url && (
              <>
                <input aria-label="Share URL" readOnly value={url} />
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied");
                    } catch {
                      toast.info("Select and copy the link above.");
                    }
                  }}
                >
                  <Copy size={16} />
                  Copy link
                </button>
              </>
            )}
            <button
              className="danger"
              onClick={async () => {
                if (!confirm("Revoke all read-only links for this project?"))
                  return;
                try {
                  await revokeShares(p.id);
                  setUrl("");
                  toast.success("Links revoked");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Trash2 size={15} />
              Revoke all links
            </button>
            <button
              className="secondary"
              disabled={!accountId || isFetching}
              onClick={async () => {
                try {
                  const result = await refetch();
                  if (result.error) throw result.error;
                  if (!result.data?.length)
                    toast.info("No cloud versions saved yet.");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <History size={16} />
              {isFetching ? "Loading versions…" : "Load version history"}
            </button>
            {versions.map((v) => (
              <button
                className="secondary"
                key={v.revision}
                onClick={() => {
                  if (confirm(`Restore cloud revision ${v.revision}?`)) {
                    const old = projectSchema.parse(v.snapshot_data);
                    useEditor.getState().edit((current) =>
                      Object.assign(current, {
                        ...old,
                        revision: current.revision,
                        cloudRevision: current.cloudRevision,
                      }),
                    );
                    close();
                  }
                }}
              >
                Restore revision {v.revision} ·{" "}
                {new Date(v.created_at).toLocaleDateString()}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
