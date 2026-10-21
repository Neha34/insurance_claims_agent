import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Instructions } from "./Instructions";
import { stubApi } from "./stubApi";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const text = "# The UnderCover Agent\n\n## 10. How we work out your payment";

it("shows the instructions, read only", async () => {
  stubApi({ "GET /api/instructions": () => ({ instructions: text }) });
  render(<Instructions />);
  const shown = await screen.findByText(/How we work out your payment/);
  expect(shown.textContent).toBe(text);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});

it("says when the instructions could not be loaded", async () => {
  stubApi({});
  render(<Instructions />);
  expect(
    await screen.findByText("The instructions could not be loaded"),
  ).toBeDefined();
});
