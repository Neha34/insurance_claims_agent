import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("a payout over $1,000 waits for a handler to sign off and pay", async ({
  page,
}) => {
  await page.goto("/#/claims/CLM-1012");
  await page.getByRole("button", { name: "Run the agent" }).click();

  const decision = page.getByRole("region", { name: "The agent's decision" });
  await expect(decision).toContainText("$2,900.00");
  await expect(
    page.getByText("Waiting for sign-off", { exact: true }),
  ).toBeVisible();
  await expect(decision).toContainText(
    "The payment of $2,900.00 waits for a handler's sign-off.",
  );
  await expect(decision).not.toContainText("Paid");
  await expect(page.getByRole("list", { name: "Run 1" })).toContainText(
    "pay_claim: Refused (403)",
  );

  await page
    .getByLabel("Signing handler")
    .selectOption({ label: "Dana Whitfield, Senior Claims Handler" });
  await page.getByRole("button", { name: "Sign off and pay" }).click();

  await expect(page.getByText("Decided", { exact: true })).toBeVisible();
  await expect(decision).toContainText(
    /Paid \$2,900\.00 on .*, signed off by Dana Whitfield/,
  );
  await expect(
    page.getByRole("button", { name: "Sign off and pay" }),
  ).toBeHidden();
});

test("the instructions page shows the agent's instructions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Instructions" }).click();
  const instructions = page.getByRole("region", {
    name: "The agent's instructions",
  });
  await expect(instructions).toContainText("# The UnderCover Agent");
  await expect(instructions).toContainText(
    "## 10. How we work out your payment",
  );
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
