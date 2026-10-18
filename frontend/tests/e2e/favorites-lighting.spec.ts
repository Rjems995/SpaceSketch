import { test, expect } from "@playwright/test";

test("searches and persists favorites without adding furniture", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Search furniture").fill("floor lighting");
  await expect(page.locator(".furniture-card")).toHaveCount(1);
  await page
    .getByRole("group", { name: "Arc floor lamp", exact: true })
    .getByRole("button", { name: "Favorite", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0]
          .furniture.length,
    ),
  ).toBe(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Favorites (1)", exact: true })
    .click();
  await expect(page.locator(".furniture-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Unfavorite", exact: true }).click();
  await expect(
    page.getByText("No matching furniture.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show all furniture", exact: true })
    .click();
  await expect(page.locator(".furniture-card")).toHaveCount(29);
});

test("edits individual lights with undo and persistence", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page
    .locator(".rail")
    .getByRole("button", { name: "Lighting", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add floor lamp", exact: true })
    .click();
  await page.getByLabel("Brightness (%)", { exact: true }).fill("150");
  await page.getByLabel("Color temperature (K)").fill("5000");
  await page.getByLabel("Light enabled", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("Light enabled", { exact: true })).toBeChecked();
  await page
    .getByRole("button", { name: "Add floor lamp", exact: true })
    .click();
  await expect(
    page.getByLabel("Brightness (%)", { exact: true }).nth(1),
  ).toHaveValue("100");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.reload();
  await page
    .locator(".rail")
    .getByRole("button", { name: "Lighting", exact: true })
    .click();
  await expect(
    page.getByLabel("Brightness (%)", { exact: true }).first(),
  ).toHaveValue("150");
  await expect(page.getByLabel("Color temperature (K)").first()).toHaveValue(
    "5000",
  );
  await expect(page.locator(".workspace canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "test-results/individual-lighting.png" });
  expect(errors).toEqual([]);
});
