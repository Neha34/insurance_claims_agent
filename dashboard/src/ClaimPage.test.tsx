import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { Claim } from "./api";
import { ClaimPage } from "./ClaimPage";
import { approved, claim, history, policy, steps } from "./fixtures";
import { stubApi } from "./stubApi";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubClaim(current: () => Claim, runs: () => unknown = () => ({})) {
  return stubApi({
    "GET /api/claims/CLM-1001": current,
    "GET /api/policies/POL-2001": () => policy,
    "GET /api/customers/CUS-3001/claims": () => history,
    "GET /api/claims/CLM-1001/steps": () =>
      current().status === "waiting" ? [] : steps,
    "POST /api/claims/CLM-1001/runs": runs,
  });
}

it("shows the claim, its policy and the customer's history", async () => {
  stubClaim(() => claim);
  render(<ClaimPage claimId="CLM-1001" />);

  expect(
    await screen.findByRole("heading", { name: claim.summary }),
  ).toBeDefined();
  expect(screen.getByText(claim.story)).toBeDefined();
  expect(
    screen.getByText("Trip delay for Maya Patel, in Rome, Italy on 2026-06-18"),
  ).toBeDefined();
  const items = screen.getByRole("region", { name: "What is claimed" });
  expect(within(items).getByText("Airport hotel, one night")).toBeDefined();
  expect(within(items).getByText("$245.00")).toBeDefined();
  expect(within(items).getByText("$420.00")).toBeDefined();
  const documents = screen.getByRole("region", { name: "Documents" });
  expect(within(documents).getByText("Carrier report")).toBeDefined();
  const thePolicy = screen.getByRole("region", { name: "The policy" });
  expect(within(thePolicy).getByText("UnderCover Premium")).toBeDefined();
  expect(within(thePolicy).getByText("Electronics plus")).toBeDefined();
  expect(within(thePolicy).getByText("$3,100.00")).toBeDefined();
  const earlier = screen.getByRole("region", { name: "Earlier claims" });
  expect(within(earlier).getByText("CLM-0412")).toBeDefined();
  expect(
    screen.getByText("The agent hasn't decided this claim yet."),
  ).toBeDefined();
  expect(
    screen.getByText("The agent hasn't worked on this claim yet."),
  ).toBeDefined();
});

it("runs the agent and refreshes until the claim is decided", async () => {
  let current: Claim = claim;
  const fetchMock = stubClaim(
    () => current,
    () => {
      current = { ...claim, status: "in_progress", thread_id: "thread-1" };
      return { claim_id: "CLM-1001", thread_id: "thread-1" };
    },
  );
  render(<ClaimPage claimId="CLM-1001" />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Run the agent" }),
  );

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/claims/CLM-1001/runs",
    expect.objectContaining({ method: "POST" }),
  );
  expect(await screen.findByRole("status")).toBeDefined();
  expect(screen.getByText("In progress")).toBeDefined();
  expect(screen.queryByRole("button", { name: "Run the agent" })).toBeNull();
  expect(screen.getByText("The claim is approved.")).toBeDefined();

  current = approved;
  expect(
    await screen.findByText("Decided", {}, { timeout: 3000 }),
  ).toBeDefined();
  expect(screen.getByText(approved.decision?.reason ?? "")).toBeDefined();

  const calls = fetchMock.mock.calls.length;
  await new Promise((resolve) => setTimeout(resolve, 1500));
  expect(fetchMock.mock.calls).toHaveLength(calls);
});

it("says when the claim could not be loaded", async () => {
  const fetchMock = stubClaim(() => claim);
  fetchMock.mockImplementationOnce(() => Promise.reject(new Error("offline")));
  render(<ClaimPage claimId="CLM-1001" />);
  expect(
    await screen.findByText("Claim CLM-1001 could not be loaded"),
  ).toBeDefined();
});

it("says when the run is refused", async () => {
  stubApi({
    "GET /api/claims/CLM-1001": () => claim,
    "GET /api/policies/POL-2001": () => policy,
    "GET /api/customers/CUS-3001/claims": () => history,
    "GET /api/claims/CLM-1001/steps": () => [],
  });
  render(<ClaimPage claimId="CLM-1001" />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Run the agent" }),
  );
  expect(
    await screen.findByText("The agent could not be started on this claim"),
  ).toBeDefined();
});
