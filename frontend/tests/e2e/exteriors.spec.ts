import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("adds and edits exteriors, exports them, and preserves them when reopened", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page).toHaveURL(/\/editor\//);
  await page
    .locator(".rail")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Add roof", exact: true }).click();
  await page.getByLabel("Roof style", { exact: true }).selectOption("shed");
  await page.getByLabel("Roof rise (m)", { exact: true }).fill("1.8");
  await page
    .getByRole("button", { name: "Apply Terracotta tiles", exact: true })
    .click();
  await page.getByRole("button", { name: "Add balcony", exact: true }).click();
  await page.getByLabel("Railing height (m)", { exact: true }).fill("1.3");
  await page.getByRole("button", { name: "Add fence", exact: true }).click();
  await page.getByLabel("Fence style", { exact: true }).selectOption("solid");
  await page.getByLabel("Fence height (m)", { exact: true }).fill("1.7");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByLabel("Show roofs in 3D").uncheck();
  const hiddenDownload = page.waitForEvent("download");
  await page.getByLabel("Export project").selectOption("glb");
  const hidden = await readFile((await (await hiddenDownload).path())!);
  const hiddenJson = JSON.parse(
    hidden.subarray(20, 20 + hidden.readUInt32LE(12)).toString(),
  );
  expect(
    hiddenJson.nodes.filter((n: { name?: string }) =>
      n.name?.startsWith("exterior-"),
    ),
  ).toHaveLength(2);
  await page.getByLabel("Show roofs in 3D").check();
  const downloading = page.waitForEvent("download");
  await page.getByLabel("Export project").selectOption("glb");
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/glb$/);
  const bytes = await readFile((await download.path())!);
  const gltf = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  expect(
    gltf.nodes.filter((n: { name?: string }) =>
      n.name?.startsWith("exterior-"),
    ),
  ).toHaveLength(3);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
  );
  expect(saved.surfaces.map((s: { kind: string }) => s.kind)).toEqual([
    "roof",
    "balcony",
    "boundary-fence",
  ]);
  expect(saved.surfaces[0].roofStyle).toBe("shed");
  expect(saved.surfaces[0].height).toBe(1.8);
  expect(saved.surfaces[0].finish.texture).toBe("tile");
  expect(saved.surfaces[1].height).toBe(1.3);
  expect(saved.surfaces[2].fenceStyle).toBe("solid");
  await page
    .getByLabel("Properties object selector")
    .selectOption(saved.surfaces[0].id);
  await expect(page.getByLabel("Roof style", { exact: true })).toHaveValue(
    "shed",
  );
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator(".workspace canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/exteriors.png" });
  expect(errors).toEqual([]);
});
