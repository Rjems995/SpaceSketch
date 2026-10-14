import { test, expect } from "@playwright/test";
test("create, edit, save, reopen, and export a project", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Room for possibilities." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page
    .getByRole("button", { name: "Linen three-seat sofa", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Object properties" }),
  ).toBeVisible();
  await page.getByLabel("Width", { exact: true }).fill("2.8");
  await page.getByLabel("Color", { exact: true }).fill("#aabbcc");
  await page.screenshot({ path: "test-results/editor-2d.png", fullPage: true });
  await page.getByTitle("Save project", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved locally" }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/editor\//);
  await expect(page.getByLabel("Project name")).toHaveValue(
    "Empty Room concept",
  );
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const data = await page.evaluate(
    () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
  );
  expect(data.furniture[0].width).toBe(2.8);
  expect(data.furniture[0].material.color).toBe("#aabbcc");
  const download = page.waitForEvent("download");
  await page.getByLabel("Export project").selectOption("json");
  expect((await download).suggestedFilename()).toContain(".json");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator(".workspace canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "test-results/editor-3d.png", fullPage: true });
});

test("imports a self-contained glTF and retains asset provenance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page).toHaveURL(/\/editor\//);
  page.on("dialog", (dialog) =>
    dialog.accept(
      dialog.message().includes("license") ? "CC0" : "Test fixture",
    ),
  );
  const positions = new Float32Array([0, 0, 0, 1, 0, 1, 0, 1, 0]);
  const document = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 1],
      },
    ],
    bufferViews: [{ buffer: 0, byteLength: 36 }],
    buffers: [
      {
        byteLength: 36,
        uri:
          "data:application/octet-stream;base64," +
          Buffer.from(positions.buffer).toString("base64"),
      },
    ],
  };
  await page.locator('input[accept=".glb,.gltf"]').setInputFiles({
    name: "sculpture.gltf",
    mimeType: "model/gltf+json",
    buffer: Buffer.from(JSON.stringify(document)),
  });
  await expect(
    page.getByRole("heading", { name: "Object properties" }),
  ).toBeVisible();
  await page.getByTitle("Save project", { exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0]
            .furniture[0]?.model?.license,
      ),
    )
    .toBe("CC0");
  await page.reload();
  await expect(page.locator(".workspace canvas")).toBeVisible();
});

test("living room renders and exports PNG, PDF, and GLB without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the living room template" })
    .click();
  await expect(page.locator(".workspace canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "test-results/living-room.png",
    fullPage: true,
  });
  for (const format of ["png", "pdf", "glb"]) {
    const pending = page.waitForEvent("download");
    await page.getByLabel("Export project").selectOption(format);
    const file = await pending;
    expect(file.suggestedFilename()).toContain("." + format);
  }
  expect(errors).toEqual([]);
});

test("mobile dashboard and touch editor fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".workspace canvas").first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
