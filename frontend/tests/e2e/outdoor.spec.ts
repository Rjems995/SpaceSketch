import { test, expect } from "@playwright/test";

test("adds outdoor items and edits a wall and window with persistence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.getByRole("button", { name: "Outdoor", exact: true }).click();
  await page.getByRole("button", { name: "Garden bench" }).click();
  await page.getByRole("button", { name: "Patio umbrella" }).click();
  const bounds = (await page.locator("canvas").first().boundingBox())!;
  const zoom = Math.max(15, Math.min(85, (bounds.width - 110) / 7, (bounds.height - 170) / 5));
  await page.mouse.click(bounds.x + 65 + zoom, bounds.y + 95);
  await expect(page.getByText("Wall dimensions", { exact: true })).toBeVisible();
  await page.getByLabel("End X (m)", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Add window", exact: true }).click();
  await page.mouse.click(bounds.x + 65 + zoom, bounds.y + 95);
  await expect(page.getByText("Window dimensions", { exact: true })).toBeVisible();
  await page.getByLabel("width (m)", { exact: true }).fill("1.6");
  await page.getByLabel("sill (m)", { exact: true }).fill("0.8");
  await page.getByTitle("Save project", { exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0]);
  expect(saved.furniture.map((o: { kind: string }) => o.kind)).toEqual(["bench", "umbrella"]);
  expect(saved.walls[0].b.x).toBe(8);
  expect(saved.openings.at(-1)).toMatchObject({ kind: "window", width: 1.6, sill: 0.8 });
  await page.reload();
  await expect(page.locator("canvas").first()).toBeVisible();
});
