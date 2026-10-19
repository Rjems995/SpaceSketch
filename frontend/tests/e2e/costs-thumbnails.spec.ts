import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("updates a dashboard preview and exports room-grouped furniture costs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page
    .getByRole("button", { name: "Oak lounge chair", exact: false })
    .click();
  await page.getByLabel("Your estimated price", { exact: true }).fill("125.50");
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page
    .locator(".rail")
    .getByRole("button", { name: "Costs", exact: true })
    .click();
  const breakdown = page.getByRole("region", {
    name: "Furniture cost breakdown",
  });
  await expect(
    breakdown.getByText("251.00", { exact: true }).first(),
  ).toBeVisible();
  await breakdown.locator("summary").click();
  await expect(
    breakdown.getByText("2 × Oak lounge chair", { exact: true }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export shopping list (CSV)", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toContain("shopping-list.csv");
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain('"Ground floor","Empty Room","Oak lounge chair"');
  expect(csv).toContain('"2","125.50","251.00"');
  await page.locator("a.brand").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const preview = page.getByRole("img", {
    name: "Empty Room concept: Ground floor design preview",
    exact: true,
  });
  await expect(preview).toBeVisible();
  const before = await preview.innerHTML();
  await page
    .getByRole("button", { name: "Open Empty Room concept", exact: true })
    .click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
  );
  await page
    .getByLabel("Properties object selector")
    .selectOption(saved.furniture[0].id);
  await page.getByLabel("Color", { exact: true }).fill("#ff0000");
  await page.locator("a.brand").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(preview).toBeVisible();
  expect(await preview.innerHTML()).not.toBe(before);
  expect(await preview.innerHTML()).toContain("#ff0000");
  await preview.screenshot({ path: "test-results/project-thumbnails.png" });
  expect(errors).toEqual([]);
});
