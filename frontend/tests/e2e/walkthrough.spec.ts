import { test, expect } from "@playwright/test";
test("walks at eye level, supports drag and touch controls, and stops while editing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await expect(page).toHaveURL(/\/editor\//);
  await page.getByRole("button", { name: "Walkthrough", exact: true }).click();
  const canvas = page.locator(".workspace canvas").first();
  await expect(canvas).toHaveAttribute("data-walk-position", /.+/);
  const position = async () =>
    JSON.parse((await canvas.getAttribute("data-walk-position"))!);
  const start = await position();
  expect(start.y).toBeCloseTo(1.65);
  await page.keyboard.down("w");
  await page.waitForTimeout(250);
  await page.keyboard.up("w");
  expect((await position()).z).toBeLessThan(start.z);
  await page
    .getByRole("button", { name: "Reset position", exact: true })
    .click();
  await expect.poll(async () => (await position()).z).toBeCloseTo(start.z);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.6 + 60,
    box.y + box.height * 0.5 + 20,
  );
  await page.mouse.up();
  await expect
    .poll(async () => Math.abs((await position()).yaw))
    .toBeGreaterThan(0.1);
  const input = page.getByLabel("Project name");
  await input.focus();
  const paused = await position();
  await page.keyboard.down("w");
  await page.waitForTimeout(150);
  await page.keyboard.up("w");
  expect((await position()).x).toBeCloseTo(paused.x);
  await page.setViewportSize({ width: 390, height: 844 });
  const forward = page.getByRole("button", {
    name: "Walk forward",
    exact: true,
  });
  await forward.scrollIntoViewIfNeeded();
  const before = await position();
  const touchBox = (await forward.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      {
        x: touchBox.x + touchBox.width / 2,
        y: touchBox.y + touchBox.height / 2,
      },
    ],
  });
  await page.waitForTimeout(200);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () =>
      Math.hypot(
        (await position()).x - before.x,
        (await position()).z - before.z,
      ),
    )
    .toBeGreaterThan(0.05);
  await page
    .getByRole("button", { name: "Exit walkthrough", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Walk-through movement" }),
  ).toHaveCount(0);
  await expect(canvas).not.toHaveAttribute("data-walk-position", /.+/);
});
