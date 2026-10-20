import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("applies and restores materials, selects with keyboard, and exports a high resolution image", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Bedroom", exact: true }).click();
  await expect(page).toHaveURL(/\/editor\//);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const selector = page.getByLabel("Properties object selector");
  const furnitureId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0]
        .furniture[0].id as string,
  );
  await selector.selectOption(furnitureId);
  await page.getByRole("button", { name: "Materials", exact: true }).click();
  await page.getByRole("button", { name: "Apply Sage fabric" }).click();
  await expect(page.getByLabel("Color", { exact: true })).toHaveValue(
    "#96a58b",
  );
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("Color", { exact: true })).not.toHaveValue(
    "#96a58b",
  );
  await page.getByRole("button", { name: "Apply Sage fabric" }).click();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved locally" }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Properties object selector").selectOption(furnitureId);
  await expect(page.getByLabel("Color", { exact: true })).toHaveValue(
    "#96a58b",
  );
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator(".workspace canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  const imageDownload = page.waitForEvent("download");
  await page.getByLabel("Export project").selectOption("png");
  const image = await imageDownload;
  const png = await readFile((await image.path())!);
  expect(png.readUInt32BE(16)).toBe(3840);
  expect(png.readUInt32BE(20)).toBeGreaterThan(1000);
  const pdfDownload = page.waitForEvent("download");
  await page.getByLabel("Export project").selectOption("pdf");
  const pdf = await readFile((await (await pdfDownload).path())!);
  expect(pdf.toString("latin1")).toContain("Dimensions in m");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close sharing" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Share", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("opens an outdoor layout and warns when furniture is duplicated", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Outdoor Patio", exact: true })
    .click();
  await expect(page.getByLabel("Project name")).toHaveValue(
    "Outdoor Patio concept",
  );
  await expect(
    page.getByText("No furniture overlaps or blocked door approaches."),
  ).toBeVisible();
  const id = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0]
        .furniture[0].id as string,
  );
  await page.getByLabel("Properties object selector").selectOption(id);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.keyboard.press("Control+d");
  await expect(
    page
      .getByRole("region", { name: "Furniture placement checks" })
      .getByRole("button")
      .first(),
  ).toContainText("overlaps");
});
