import { test, expect } from "@playwright/test";
test("compares session designs without restoring them", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page
    .getByRole("button", { name: "Oak lounge chair", exact: false })
    .click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const comparison = page.getByRole("region", {
    name: "Before and after comparison",
  });
  await expect(comparison).toBeVisible();
  await expect(comparison.getByText(/0 furniture items/)).toBeVisible();
  await expect(comparison.getByText(/1 furniture items/)).toBeVisible();
  const svgs = comparison.locator("svg");
  expect(await svgs.nth(0).getAttribute("viewBox")).toBe(
    await svgs.nth(1).getAttribute("viewBox"),
  );
  await comparison.getByLabel("Before version").selectOption("current");
  await expect(comparison.getByText(/1 furniture items/)).toHaveCount(2);
  await page
    .getByRole("button", { name: "Close sharing", exact: true })
    .click();
  await expect(page.getByLabel("Properties object selector")).toHaveValue(/.+/);
});
