import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("the agent decides a claim and the page shows its steps", async ({
  page,
}) => {
  await page.goto("/#/claims/CLM-1001");
  await expect(
    page.getByRole("heading", {
      name: "Flight home canceled by the airline, rebooked the next morning",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("The agent hasn't decided this claim yet."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Run the agent" }).click();

  const steps = page.getByRole("list", { name: "Run 1" });
  await expect(steps).toContainText('get_claim(claim_id="CLM-1001")');
  await expect(steps).toContainText('get_policy(policy_id="POL-2001")');
  await expect(steps).toContainText("pay_claim(amount=420.0)");
  const decision = page.getByRole("region", { name: "The agent's decision" });
  await expect(decision).toContainText("Approve");
  await expect(decision).toContainText("$420.00");
  await expect(decision).toContainText(
    "The policy wording covers the claim in full.",
  );
  await expect(decision).toContainText(
    "Section 5, Baggage and Personal Effects",
  );
  await expect(decision).toContainText("Paid $420.00");

  await page.getByRole("link", { name: "Back to the queue" }).click();
  const row = page.getByRole("row").filter({ hasText: "CLM-1001" });
  await expect(row).toContainText("Decided");
  await expect(row).toContainText("Approve, $420.00");
});

test("working the queue moves every claim out of waiting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Work the queue" }).click();
  await expect(
    page.getByRole("cell", { name: "Waiting", exact: true }),
  ).toHaveCount(0, { timeout: 30_000 });
  await expect(
    page.getByRole("cell", { name: "In progress", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Work the queue" }),
  ).toBeDisabled();
});
