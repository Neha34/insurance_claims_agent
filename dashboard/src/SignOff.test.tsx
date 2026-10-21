import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { Claim, Handler } from "./api";
import { ClaimPage } from "./ClaimPage";
import { approved, history, policy } from "./fixtures";
import { SignOff } from "./SignOff";
import { stubApi } from "./stubApi";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const handlers: Handler[] = [
  {
    handler_id: "HND-01",
    name: "Dana Whitfield",
    role: "Senior Claims Handler",
    can_approve_over_limit: true,
  },
  {
    handler_id: "HND-04",
    name: "Sam Trainee",
    role: "Trainee",
    can_approve_over_limit: false,
  },
];

if (!approved.decision) throw new Error("The fixture has no decision");

const waiting: Claim = {
  ...approved,
  status: "waiting_for_sign_off",
  decision: { ...approved.decision, payout: 2900 },
  payment: null,
};

const signedOff: Claim = {
  ...waiting,
  status: "decided",
  sign_off: {
    handler_id: "HND-01",
    name: "Dana Whitfield",
    signed_off_at: "2026-10-21T23:09:00+00:00",
  },
  payment: { amount: 2900, paid_at: "2026-10-21T23:09:00+00:00" },
};

it("signs off as a handler, then shows the payment and who signed off", async () => {
  let current = waiting;
  const fetchMock = stubApi({
    "GET /api/claims/CLM-1001": () => current,
    "GET /api/policies/POL-2001": () => policy,
    "GET /api/customers/CUS-3001/claims": () => history,
    "GET /api/claims/CLM-1001/steps": () => [],
    "GET /api/handlers": () => handlers,
    "POST /api/claims/CLM-1001/sign-off": () => {
      current = signedOff;
      return signedOff;
    },
  });
  render(<ClaimPage claimId="CLM-1001" />);

  const button = await screen.findByRole("button", {
    name: "Sign off and pay",
  });
  expect(button).toHaveProperty("disabled", true);
  await screen.findByRole("option", {
    name: "Dana Whitfield, Senior Claims Handler",
  });
  expect(screen.queryByRole("option", { name: /Sam Trainee/ })).toBeNull();

  await userEvent.selectOptions(
    screen.getByLabelText("Signing handler"),
    "HND-01",
  );
  await userEvent.click(button);

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/claims/CLM-1001/sign-off",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ handler_id: "HND-01" }),
    }),
  );
  expect(
    await screen.findByText(
      /^Paid \$2,900\.00 on .*, signed off by Dana Whitfield$/,
    ),
  ).toBeDefined();
  expect(screen.queryByRole("button", { name: "Sign off and pay" })).toBeNull();
});

it("says when the sign-off is refused", async () => {
  stubApi({ "GET /api/handlers": () => handlers });
  const onSignedOff = vi.fn();
  render(<SignOff claimId="CLM-1001" onSignedOff={onSignedOff} />);
  await screen.findByRole("option", { name: /Dana Whitfield/ });
  await userEvent.selectOptions(
    screen.getByLabelText("Signing handler"),
    "HND-01",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Sign off and pay" }),
  );
  expect(await screen.findByText("The sign-off was refused")).toBeDefined();
  expect(onSignedOff).not.toHaveBeenCalled();
});

it("says when the handlers could not be loaded", async () => {
  stubApi({});
  render(<SignOff claimId="CLM-1001" onSignedOff={vi.fn()} />);
  expect(
    await screen.findByText("The handlers could not be loaded"),
  ).toBeDefined();
});
