import { test, expect } from "@playwright/test";

test("creates an upstairs layout with stairs and preserves floors on reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bedroom", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.getByText("Manage floors", { exact: true }).click();
  await page.getByRole("button", { name: "Add floor", exact: true }).click();
  await page.getByLabel("Floor name", { exact: true }).fill("Upstairs");
  await page.getByText("Manage floors", { exact: true }).click();
  await expect(
    page.getByLabel("Properties object selector").locator("option"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Straight staircase", exact: false })
    .click();
  await page.getByLabel("Height", { exact: true }).fill("3.2");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.reload();
  await expect(
    page.getByLabel("Active floor").locator("option:checked"),
  ).toHaveText("Upstairs (3 m)");
  await page.getByLabel("Active floor").selectOption("ground");
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
  );
  await expect(
    page.getByLabel("Properties object selector").locator("option"),
  ).toHaveCount(12);
  await page.getByLabel("Active floor").selectOption(saved.activeFloor.id);
  await expect(
    page.getByLabel("Properties object selector").locator("option"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator(".workspace canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/upstairs.png" });
});

test("edits room corners and curves a boundary with undo", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  const p = await page.evaluate(
    () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
  );
  await page
    .getByLabel("Properties object selector")
    .selectOption(p.rooms[0].id);
  await page.getByLabel("Corner 3 x", { exact: true }).fill("6");
  await expect(page.getByLabel("Corner 3 x", { exact: true })).toHaveValue("6");
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("Corner 3 x", { exact: true })).toHaveValue("7");
  const bounds = (await page.locator(".workspace canvas").boundingBox())!;
  const zoom = Math.max(
    15,
    Math.min(85, (bounds.width - 110) / 7, (bounds.height - 170) / 5),
  );
  await page.mouse.move(bounds.x + 65 + 7 * zoom, bounds.y + 95 + 5 * zoom);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 65 + 6 * zoom, bounds.y + 95 + 5 * zoom, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByLabel("Corner 3 x", { exact: true })).toHaveValue("6");
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("Corner 3 x", { exact: true })).toHaveValue("7");
  await page
    .getByLabel("Properties object selector")
    .selectOption(p.walls[2].id);
  await page.getByText("Curve this wall", { exact: true }).click();
  await page.getByLabel("Curve bend", { exact: true }).fill("-1");
  await page
    .getByRole("button", { name: "Apply wall curve", exact: true })
    .click();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  const curved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
  );
  expect(curved.walls).toHaveLength(19);
  expect(curved.rooms[0].points).toHaveLength(19);
  await page.screenshot({ path: "test-results/curved-room.png" });
});

test("draws a curved wall on a separate floor with three clicks", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.getByText("Manage floors", { exact: true }).click();
  await page.getByRole("button", { name: "Add floor", exact: true }).click();
  await page.getByText("Manage floors", { exact: true }).click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page
    .getByRole("button", { name: "Draw curved wall", exact: true })
    .click();
  const bounds = (await page.locator(".workspace canvas").boundingBox())!;
  const zoom = Math.max(
    15,
    Math.min(85, (bounds.width - 110) / 7, (bounds.height - 170) / 5),
  );
  for (const [x, z] of [
    [1, 2],
    [3, 4],
    [6, 2],
  ])
    await page.mouse.click(bounds.x + 65 + x * zoom, bounds.y + 95 + z * zoom);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  const p = await page.evaluate(
    () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
  );
  expect(p.walls).toHaveLength(16);
  expect(p.floors[0].plan.walls).toHaveLength(4);
});
