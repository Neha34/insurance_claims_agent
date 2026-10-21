import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { claim, history, policy } from "./fixtures";
import { stubApi } from "./stubApi";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

function stubPages() {
  stubApi({
    "GET /api/claims": () => [],
    "GET /api/claims/CLM-1001": () => claim,
    "GET /api/policies/POL-2001": () => policy,
    "GET /api/customers/CUS-3001/claims": () => history,
    "GET /api/claims/CLM-1001/steps": () => [],
  });
}

it("opens on the queue", async () => {
  stubPages();
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "The queue" }),
  ).toBeDefined();
});

it("opens a claim from its address, and goes back to the queue", async () => {
  stubPages();
  window.location.hash = "#/claims/CLM-1001";
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: claim.summary }),
  ).toBeDefined();

  act(() => {
    window.location.hash = "#/";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  expect(
    await screen.findByRole("heading", { name: "The queue" }),
  ).toBeDefined();
});
