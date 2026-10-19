import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
const envPath = ".env.local";
const url = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
      .match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, "")
  : undefined;
test("queues offline edits, syncs after reconnect, and preserves conflicts as a copy", async ({
  page,
  context,
}) => {
  test.skip(
    !url,
    "Requires frontend public Supabase URL; all API calls are mocked.",
  );
  const account = "11111111-1111-4111-8111-111111111111";
  const storageKey =
    "sb-" + new URL(url!).hostname.split(".")[0] + "-auth-token";
  await context.addInitScript(
    ({ storageKey, account }) => {
      if (!localStorage.getItem(storageKey))
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: account,
              email: "offline@example.test",
              aud: "authenticated",
              role: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: new Date().toISOString(),
            },
          }),
        );
    },
    { storageKey, account },
  );
  let conflict = false,
    uploads = 0;
  await context.route(new URL(url!).origin + "/**", async (route) => {
    if (route.request().url().includes("/rpc/save_project")) {
      if (conflict)
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            message:
              "Cloud version is newer. Reload cloud projects before saving.",
          }),
        });
      const p = route.request().postDataJSON().payload;
      uploads++;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ...p, cloudRevision: p.cloudRevision + 1 }),
      });
    }
    return route.fulfill({ contentType: "application/json", body: "[]" });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Oak lounge chair", exact: false })
    .click();
  await expect(
    page.getByText("Offline: changes saved on this device", { exact: false }),
  ).toBeVisible();
  expect(uploads).toBe(0);
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Saved to cloud", exact: true }),
  ).toBeVisible();
  expect(uploads).toBeGreaterThan(0);
  conflict = true;
  await page.getByLabel("Project name").fill("Offline conflict test");
  await expect(
    page.getByText("Offline conflict test: sync needs attention", {
      exact: true,
    }),
  ).toBeVisible();
  const pending = await page.evaluate(
    (account) =>
      JSON.parse(localStorage.getItem("spacesketch-sync-v1:" + account)!),
    account,
  );
  expect(pending).toHaveLength(1);
  conflict = false;
  await page
    .getByRole("button", {
      name: "Keep offline work as separate project",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Project name")).toHaveValue(
    "Offline conflict test (offline copy)",
  );
  await expect.poll(() => uploads).toBeGreaterThan(1);
});
