import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  const texts = (row: HTMLElement, role: "columnheader" | "cell") =>
    within(row)
      .getAllByRole(role)
      .map((cell) => cell.textContent);
  expect(texts(rows[0], "columnheader")).toEqual([
    "Claim",
    "Customer",
    "Type",
    "Summary",
    "Claimed",
    "Submitted",
    "Status",
    "Decision",
    "Payout",
  ]);
  expect(texts(rows[1], "cell")).toEqual([
    "CLM-1001",
    "Tom Becker",
    "Trip delay",
    "Suitcase lost on a connecting flight",
    "$420.00",
    "2026-07-02",
    "Decided",
    "Approve",
    "$420.00",
  ]);
  expect(texts(rows[2], "cell")).toEqual([
    "CLM-1002",
    "Tom Becker",
    "Baggage",
    "Suitcase lost on a connecting flight",
    "$1,150.00",
    "2026-07-02",
    "Waiting",
    "",
    "",
  ]);
});

it("leaves the payout empty on a decline", async () => {
  stubApi({
    "GET /api/claims": () => [{ ...decided, decision: "decline", payout: 0 }],
  });
  render(<Queue />);
  const cells = within((await screen.findAllByRole("row"))[1]).getAllByRole(
    "cell",
  );
  expect(cells[7].textContent).toBe("Decline");
  expect(cells[8].textContent).toBe("");
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

it("links each claim to its page", async () => {
  stubApi({ "GET /api/claims": () => [waiting] });
  render(<Queue />);
  const link = await screen.findByRole("link", { name: "CLM-1002" });
  expect(link.getAttribute("href")).toBe("#/claims/CLM-1002");
});

it("works the queue and refreshes while claims are waiting", async () => {
  let claims = [waiting];
  const fetchMock = stubApi({
    "GET /api/claims": () => claims,
    "POST /api/queue/runs": () => {
      claims = [{ ...waiting, status: "in_progress" }];
      return { claim_ids: ["CLM-1002"] };
    },
  });
  render(<Queue />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Work the queue" }),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/queue/runs",
    expect.objectContaining({ method: "POST" }),
  );
  expect(
    await screen.findByRole("cell", { name: "In progress" }),
  ).toBeDefined();

  claims = [{ ...decided, claim_id: "CLM-1002" }];
  expect(
    await screen.findByRole("cell", { name: "Decided" }, { timeout: 3000 }),
  ).toBeDefined();
  expect(screen.getByRole("button", { name: "Work the queue" })).toHaveProperty(
    "disabled",
    true,
  );
});

it("says when the queue could not be started", async () => {
  stubApi({ "GET /api/claims": () => [waiting] });
  render(<Queue />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Work the queue" }),
  );
  expect(
    await screen.findByText("The agent could not be started on the queue"),
  ).toBeDefined();
});
