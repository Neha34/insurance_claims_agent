import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("the queue lists the 25 claims, all waiting", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByRole("row");
  await expect(rows).toHaveCount(26);
  await expect(rows.nth(1)).toContainText("CLM-1001");
  await expect(rows.nth(1)).toContainText("Maya Patel");
  await expect(rows.nth(1)).toContainText("$420.00");
  await expect(rows.nth(25)).toContainText("CLM-1025");
  await expect(
    page.getByRole("cell", { name: "Waiting", exact: true }),
  ).toHaveCount(25);
});

test.describe("in dark mode", () => {
  test.use({ colorScheme: "dark" });

  test("the page uses the dark background", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      "rgb(4, 35, 46)",
    );
  });
});
