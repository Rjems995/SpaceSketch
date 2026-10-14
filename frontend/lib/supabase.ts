import { createClient } from "@supabase/supabase-js";
import { Project, projectSchema } from "./model";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export async function syncCloud(p: Project) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("save_project", { payload: p });
  if (error) throw error;
  return projectSchema.parse(data);
}
export async function createShare(id: string) {
  if (!supabase)
    throw new Error("Configure Supabase to share read-only links.");
  const { data, error } = await supabase
    .from("project_shares")
    .insert({ project_id: id })
    .select("token")
    .single();
  if (error) throw error;
  return `${window.location.origin}/share/${data.token}`;
}
export async function revokeShares(id: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("project_shares")
    .delete()
    .eq("project_id", id);
  if (error) throw error;
}
export async function projectVersions(id: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("project_versions")
    .select("revision,snapshot_data,created_at")
    .eq("project_id", id)
    .order("revision", { ascending: false });
  if (error) throw error;
  return data;
}
export async function cloudProjects() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("project_data")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => projectSchema.parse(r.project_data));
}
export async function deleteCloudProject(id: string) {
  if (!supabase) throw new Error("Cloud connection is not configured.");
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
