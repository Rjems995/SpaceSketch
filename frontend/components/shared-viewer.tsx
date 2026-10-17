"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import FloorControls from "./floor-controls";
import BrandLogo from "./brand-logo";
import { supabase } from "@/lib/supabase";
import { projectSchema } from "@/lib/model";
import { useEditor } from "@/stores/editor";
const Scene = dynamic(() => import("./scene"), { ssr: false });
export default function SharedViewer({ token }: { token: string }) {
  const [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  const p = useEditor((s) => s.project);
  useEffect(() => {
    if (!supabase) {
      setError("Cloud sharing is not configured.");
      return;
    }
    supabase
      .rpc("view_shared_project", { share_token: token })
      .then(({ data, error }) => {
        if (error || !data) {
          setError("This link is invalid or has been revoked.");
          return;
        }
        const parsed = projectSchema.safeParse(data);
        if (!parsed.success) {
          setError("This project could not be loaded.");
          return;
        }
        useEditor.getState().load(parsed.data);
        setLoaded(true);
      });
  }, [token]);
  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/">
          <BrandLogo />
        </Link>
        <span>{p?.name}</span>
        {loaded && <FloorControls readOnly />}
        <span className="top-tagline">Read-only design</span>
      </header>
      <div style={{ height: "calc(100dvh - 74px)" }}>
        {error ? (
          <div className="empty">{error}</div>
        ) : loaded ? (
          <Scene
            key={p?.activeFloor?.id ?? "ground"}
            preset="Isometric"
            walk={false}
            quality="High"
            ceiling={false}
            readOnly
          />
        ) : (
          <div className="empty">Loading shared design…</div>
        )}
      </div>
    </>
  );
}
