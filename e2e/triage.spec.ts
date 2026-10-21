import { expect, test } from "@playwright/test";

test("the dashboard triages a claim through the backend", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Reference").fill("CLM-E2E");
  await page.getByLabel("Policy number").fill("POL-E2E");
  await page.getByLabel("Amount").fill("250");
  await page.getByLabel("Description").fill("Cracked windscreen");
  await page.getByRole("button", { name: "Triage" }).click();
  await expect(
    page.getByText("Decision: approve — Under the auto-approval limit"),
  ).toBeVisible();
});
