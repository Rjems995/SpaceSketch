import { test, expect } from "@playwright/test";
test("draws room geometry and groups a furniture drag into one undo step", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page).toHaveURL(/\/editor\//);
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.locator(".room-row").first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete room", exact: true }).click();
  await page.getByTitle("Draw room", { exact: true }).click();
  const canvas = page.locator("canvas").first();
  const bounds = (await canvas.boundingBox())!;
  const zoom = Math.max(
    15,
    Math.min(85, (bounds.width - 110) / 7, (bounds.height - 170) / 5),
  );
  const screen = (x: number, z: number) => ({
    x: bounds.x + 65 + x * zoom,
    y: bounds.y + 95 + z * zoom,
  });
  await page.mouse.click(screen(1, 1).x, screen(1, 1).y);
  await page.mouse.click(screen(5, 4).x, screen(5, 4).y);
  await page.getByTitle("Select", { exact: true }).click();
  await page.getByRole("button", { name: "Linen three-seat sofa" }).click();
  const start = screen(3, 3),
    end = screen(4, 3);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await page.mouse.up();
  await page.getByTitle("Save project", { exact: true }).click();
  const project = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem("spacesketch-projects-v1")!)[0],
    );
  await expect
    .poll(async () => (await project()).furniture[0].x)
    .toBeCloseTo(4, 1);
  await page.keyboard.press("Control+z");
  await page.getByTitle("Save project", { exact: true }).click();
  await expect
    .poll(async () => (await project()).furniture[0].x)
    .toBeCloseTo(3, 1);
  expect((await project()).rooms[0].points).toEqual([
    { x: 1, z: 1 },
    { x: 5, z: 1 },
    { x: 5, z: 4 },
    { x: 1, z: 4 },
  ]);
});
