import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DecisionPanel } from "./DecisionPanel";
import { approved, claim } from "./fixtures";
import { stubApi } from "./stubApi";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const noop = () => undefined;

it("shows an approval, its reason, section and payment", () => {
  render(<DecisionPanel claim={approved} onChange={noop} />);
  expect(screen.getByText("Approve")).toBeDefined();
  expect(screen.getByText("$420.00")).toBeDefined();
  expect(
    screen.getByText("The airline canceled the flight for a crew problem."),
  ).toBeDefined();
  expect(screen.getByText("Section 3, Trip Delay")).toBeDefined();
  expect(screen.getByText(/^Paid \$420\.00 on /)).toBeDefined();
});

it("says when an over-limit payment waits for sign-off", () => {
  stubApi({ "GET /api/handlers": () => [] });
  if (!approved.decision) throw new Error("The fixture has no decision");
  render(
    <DecisionPanel
      claim={{
        ...approved,
        status: "waiting_for_sign_off",
        decision: { ...approved.decision, payout: 2900 },
        payment: null,
      }}
      onChange={noop}
    />,
  );
  expect(
    screen.getByText(
      "The payment of $2,900.00 waits for a handler's sign-off.",
    ),
  ).toBeDefined();
});

it("shows who signed off a payment", () => {
  render(
    <DecisionPanel
      claim={{
        ...approved,
        sign_off: {
          handler_id: "HND-01",
          name: "Dana Whitfield",
          signed_off_at: "2026-10-21T23:09:00+00:00",
        },
      }}
      onChange={noop}
    />,
  );
  expect(screen.getByText(/signed off by Dana Whitfield$/)).toBeDefined();
});

it("says when an approval is not paid yet", () => {
  render(
    <DecisionPanel claim={{ ...approved, payment: null }} onChange={noop} />,
  );
  expect(screen.getByText("Not paid yet.")).toBeDefined();
});

it("shows a decline without a payout", () => {
  if (!approved.decision) throw new Error("The fixture has no decision");
  render(
    <DecisionPanel
      claim={{
        ...approved,
        decision: { ...approved.decision, decision: "decline", payout: 0 },
        payment: null,
      }}
      onChange={noop}
    />,
  );
  expect(screen.getByText("Decline")).toBeDefined();
  expect(screen.queryByText("$0.00")).toBeNull();
  expect(screen.queryByText(/paid/i)).toBeNull();
});

it("says when the agent is working", () => {
  render(
    <DecisionPanel
      claim={{ ...claim, status: "in_progress" }}
      onChange={noop}
    />,
  );
  expect(screen.getByText("The agent is working on this claim.")).toBeDefined();
});
