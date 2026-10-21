import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ClaimSummary } from "./api";
import { Queue } from "./Queue";
import { stubApi } from "./stubApi";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const waiting: ClaimSummary = {
  claim_id: "CLM-1002",
  customer_name: "Tom Becker",
  claim_type: "baggage",
  summary: "Suitcase lost on a connecting flight",
  amount_claimed: 1150,
  submitted_on: "2026-07-02",
  status: "waiting",
  decision: null,
  payout: null,
};

const decided: ClaimSummary = {
  ...waiting,
  claim_id: "CLM-1001",
  claim_type: "trip_delay",
  amount_claimed: 420,
  status: "decided",
  decision: "approve",
  payout: 420,
};

it("lists the claims with their status, amounts and decisions", async () => {
  stubApi({ "GET /api/claims": () => [decided, waiting] });
  render(<Queue />);
  const rows = await screen.findAllByRole("row");
  expect(rows).toHaveLength(3);
  const first = within(rows[1]);
  expect(first.getByText("CLM-1001")).toBeDefined();
  expect(first.getByText("Trip delay")).toBeDefined();
  expect(first.getByText("Decided")).toBeDefined();
  expect(first.getByText("Approve, $420.00")).toBeDefined();
  const second = within(rows[2]);
  expect(second.getByText("$1,150.00")).toBeDefined();
  expect(second.getByText("Waiting")).toBeDefined();
});

it("counts the claims in each status", async () => {
  stubApi({ "GET /api/claims": () => [decided, waiting, waiting] });
  render(<Queue />);
  const tiles = await screen.findByRole("region", {
    name: "Where the claims stand",
  });
  expect(within(tiles).getByText("Waiting").nextSibling?.textContent).toBe("2");
  expect(within(tiles).getByText("Decided").nextSibling?.textContent).toBe("1");
});

it("says when the queue could not be loaded", async () => {
  stubApi({});
  render(<Queue />);
  expect((await screen.findByText(/could not be loaded/)).className).toBe(
    "alert",
  );
});
