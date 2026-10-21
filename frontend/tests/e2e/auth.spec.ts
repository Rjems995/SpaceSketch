import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
const url = (existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "")
  .match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]
  .trim()
  .replace(/^["']|["']$/g, "");
test("account forms validate, recover passwords and confirm signup without live account writes", async ({
  page,
  context,
}) => {
  test.skip(
    !url,
    "Requires public Supabase configuration; requests are mocked.",
  );
  let signups = 0,
    recoveries = 0;
  await context.route(new URL(url!).origin + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/signup")) {
      signups++;
      return route.fulfill({
        json: {
          user: { id: "test", email: "person@example.test" },
          session: null,
        },
      });
    }
    if (path.endsWith("/recover")) {
      recoveries++;
      return route.fulfill({ json: {} });
    }
    return route.fulfill({
      status: 400,
      json: {
        message: "Invalid login credentials",
        error_code: "invalid_credentials",
      },
    });
  });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill("person@example.test");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Log in to your studio" }).click();
  await expect(page.locator(".auth-error")).toContainText(
    "Invalid login credentials",
  );
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByRole("status")).toContainText("If an account matches");
  expect(recoveries).toBe(1);
  await page.getByRole("link", { name: "Sign up", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make yourself at home." }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill("person@example.test");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("different123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator(".auth-error")).toContainText("do not match");
  expect(signups).toBe(0);
  await page.getByLabel("Confirm password").fill("password123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox." }),
  ).toBeVisible();
  expect(signups).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login?next=https://example.com");
  await expect(
    page.getByRole("link", { name: "Sign up", exact: true }),
  ).toHaveAttribute("href", "/signup?next=%2Fdashboard");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".auth-house canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
});

test("successful login returns to the dashboard", async ({ page, context }) => {
  test.skip(
    !url,
    "Requires public Supabase configuration; requests are mocked.",
  );
  await context.route(new URL(url!).origin + "/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/token"))
      return route.fulfill({
        json: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "person@example.test",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        },
      });
    return route.fulfill({ json: [] });
  });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("person@example.test");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Log in to your studio" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("button", { name: "Your account", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page).toHaveURL(/\/editor\//);
});

test("signed-out visitors cannot create projects from the homepage", async ({
  page,
  context,
}) => {
  if (url)
    await context.route(new URL(url).origin + "/**", (route) =>
      route.fulfill({ json: {} }),
    );
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("spacesketch-projects-v1") || "[]"),
    ),
  ).toHaveLength(0);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a space", exact: false })
    .click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("spacesketch-projects-v1") || "[]"),
    ),
  ).toHaveLength(0);
});
