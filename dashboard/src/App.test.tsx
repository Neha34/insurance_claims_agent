import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { stubApi } from "./stubApi";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("opens on the queue", async () => {
  stubApi({ "GET /api/claims": () => [] });
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "The queue" }),
  ).toBeDefined();
});
