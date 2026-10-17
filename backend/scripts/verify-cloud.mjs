import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const root = new URL("../../", import.meta.url);
for (const file of ["frontend/.env.local", "backend/.env.test.local"]) {
  const path = fileURLToPath(new URL(file, root));
  if (existsSync(path)) process.loadEnvFile(path);
}
const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_TEST_EMAIL_A",
  "SUPABASE_TEST_PASSWORD_A",
  "SUPABASE_TEST_EMAIL_B",
  "SUPABASE_TEST_PASSWORD_B",
];
const missing = names.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(
    `Live verification not run. Missing configuration: ${missing.join(", ")}. See backend/README.md.`,
  );
  process.exit(2);
}
const require = createRequire(new URL("frontend/package.json", root));
const { createClient } = require("@supabase/supabase-js");
const client = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, signal: AbortSignal.timeout(20000) }),
      },
    },
  );
const device1 = client(),
  device2 = client(),
  other = client(),
  anonymous = client();
const id = randomUUID();
const checks = [];
let created = false;
function data(result, label) {
  assert.equal(
    result.error,
    null,
    `${label} failed (code ${result.error?.code ?? "unknown"})`,
  );
  return result.data;
}
function pass(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}
async function deniedRead(c, table, key = "project_id") {
  const result = await c.from(table).select("*").eq(key, id);
  assert.ok(
    result.error || result.data.length === 0,
    `${table}: unauthorized rows were exposed`,
  );
}
async function save(c, payload) {
  return data(await c.rpc("save_project", { payload }), "save_project");
}
async function load(c) {
  return data(
    await c.from("projects").select("project_data").eq("id", id).single(),
    "project read",
  ).project_data;
}
try {
  const signIn = async (c, suffix) =>
    data(
      await c.auth.signInWithPassword({
        email: process.env[`SUPABASE_TEST_EMAIL_${suffix}`],
        password: process.env[`SUPABASE_TEST_PASSWORD_${suffix}`],
      }),
      `Sign-in ${suffix}`,
    );
  const a = await signIn(device1, "A"),
    a2 = await signIn(device2, "A"),
    b = await signIn(other, "B");
  assert.equal(a.user.id, a2.user.id);
  assert.notEqual(a.user.id, b.user.id, "Use two different test accounts");
  pass("Two distinct accounts and independent sessions authenticate");
  const payload = {
    schemaVersion: 1,
    id,
    name: `Cloud verification ${id}`,
    updatedAt: new Date().toISOString(),
    revision: 0,
    cloudRevision: 0,
    rooms: [],
    walls: [],
    furniture: [],
    openings: [],
    surfaces: [],
    measurements: [],
    units: "m",
    lighting: { night: false, sun: 45 },
    camera: { preset: "Isometric", speed: 2, eyeHeight: 1.65 },
  };
  let current = await save(device1, payload);
  created = true;
  assert.equal(current.cloudRevision, 1);
  assert.deepEqual(await load(device2), current);
  pass("Owner saves and a second session loads identical project data");
  await deniedRead(other, "projects", "id");
  await deniedRead(anonymous, "projects", "id");
  assert.ok(
    (await other.rpc("save_project", { payload: current })).error,
    "Another account could overwrite the project",
  );
  assert.ok(
    (await anonymous.rpc("save_project", { payload: current })).error,
    "Anonymous saving was permitted",
  );
  await other.from("projects").delete().eq("id", id);
  assert.deepEqual(await load(device1), current);
  pass(
    "Other accounts and anonymous sessions cannot read, overwrite, or delete the owner project",
  );
  const write = await device1
    .from("projects")
    .update({
      name: "Bypassed RPC",
      project_data: { ...current, name: "Bypassed RPC" },
    })
    .eq("id", id)
    .select("id");
  assert.ok(
    write.error || write.data.length === 0,
    "Direct writes bypass save_project",
  );
  assert.deepEqual(await load(device1), current);
  pass("Direct project updates cannot bypass revision checking");
  current = await save(device2, {
    ...current,
    name: "Updated on second device",
  });
  assert.equal(current.cloudRevision, 2);
  assert.ok(
    (await device1.rpc("save_project", { payload })).error,
    "Stale save unexpectedly succeeded",
  );
  const versions = data(
    await device1
      .from("project_versions")
      .select("revision,snapshot_data")
      .eq("project_id", id),
    "version history",
  );
  assert.equal(versions.length, 1);
  assert.equal(versions[0].revision, 1);
  await deniedRead(other, "project_versions");
  await deniedRead(anonymous, "project_versions");
  pass("Stale saves fail and history is visible only to the owner");
  current = await save(device1, {
    ...versions[0].snapshot_data,
    revision: current.revision,
    cloudRevision: current.cloudRevision,
  });
  assert.equal(current.cloudRevision, 3);
  assert.equal(current.name, payload.name);
  assert.deepEqual(await load(device2), current);
  pass(
    "A historical snapshot restores as a new revision and loads in another session",
  );
  const race = await Promise.all([
    device1.rpc("save_project", {
      payload: { ...current, name: "Concurrent A" },
    }),
    device2.rpc("save_project", {
      payload: { ...current, name: "Concurrent B" },
    }),
  ]);
  assert.equal(
    race.filter((r) => !r.error).length,
    1,
    "Concurrent writes must have exactly one winner",
  );
  current = await load(device1);
  assert.equal(current.cloudRevision, 4);
  pass("Concurrent saves serialize and reject the stale writer");
  const share = data(
    await device1
      .from("project_shares")
      .insert({ project_id: id })
      .select("token")
      .single(),
    "create share",
  );
  await deniedRead(other, "project_shares");
  await deniedRead(anonymous, "project_shares");
  assert.ok(
    (await other.from("project_shares").insert({ project_id: id })).error,
    "Another account created an owner share",
  );
  await other.from("project_shares").delete().eq("project_id", id);
  assert.deepEqual(
    data(
      await anonymous.rpc("view_shared_project", { share_token: share.token }),
      "shared read",
    ),
    current,
  );
  current = await save(device2, { ...current, name: "Latest shared version" });
  assert.deepEqual(
    data(
      await anonymous.rpc("view_shared_project", { share_token: share.token }),
      "latest shared read",
    ),
    current,
  );
  data(
    await device1.from("project_shares").delete().eq("project_id", id),
    "revoke share",
  );
  assert.equal(
    data(
      await anonymous.rpc("view_shared_project", { share_token: share.token }),
      "revoked read",
    ),
    null,
  );
  pass(
    "Sharing exposes the latest saved version and revocation immediately removes access",
  );
} catch (error) {
  // Do not print HTTP request details, tokens, credentials, or project contents.
  console.error(
    `FAIL ${error instanceof Error ? error.message : "Verification failed"}`,
  );
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      data(
        await device1.from("projects").delete().eq("id", id),
        "test project cleanup",
      );
      const left = data(
        await device1.from("projects").select("id").eq("id", id),
        "cleanup check",
      );
      assert.equal(left.length, 0);
      await deniedRead(device1, "project_versions");
      await deniedRead(device1, "project_shares");
      console.log("PASS Temporary project, versions, and shares removed");
    } catch {
      console.error(
        `Cleanup failed. Remove only verification project ${id} using test account A.`,
      );
      process.exitCode = 1;
    }
  }
  console.log(
    `${checks.length} live check groups passed. ${process.exitCode ? "Verification incomplete." : "Verification complete."}`,
  );
}
