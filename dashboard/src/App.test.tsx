import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Reference"), "CLM-1");
  await user.type(screen.getByLabelText("Policy number"), "POL-1");
  await user.type(screen.getByLabelText("Amount"), "250");
  await user.type(screen.getByLabelText("Description"), "Cracked windscreen");
  await user.click(screen.getByRole("button", { name: "Triage" }));
}

it("shows the decision the API returns", async () => {
  const triage = {
    reference: "CLM-1",
    decision: "approve",
    reason: "Under the auto-approval limit",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(triage))),
  );
  render(<App />);
  await fillAndSubmit();
  expect(
    await screen.findByText(/approve — Under the auto-approval limit/),
  ).toBeDefined();
});

it("shows an error when the API is unreachable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<App />);
  await fillAndSubmit();
  expect(await screen.findByRole("alert")).toBeDefined();
});

it("shows an error when the API rejects the claim", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 500 })),
  );
  render(<App />);
  await fillAndSubmit();
  expect(await screen.findByRole("alert")).toBeDefined();
});
