import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { steps } from "./fixtures";
import { Steps } from "./Steps";

afterEach(cleanup);

it("lists the steps in order, with what kind each one is", () => {
  render(<Steps steps={steps} working={false} />);
  const items = within(
    screen.getByRole("list", { name: "Run 1" }),
  ).getAllByRole("listitem");
  expect(items.map((item) => item.textContent)).toEqual([
    'Callsget_claim(claim_id="CLM-1001")',
    'Resultget_claim: {"claim_id":"CLM-1001"}',
    "SaysThe claim is approved.",
  ]);
  expect(screen.queryByRole("heading", { name: "Run 1" })).toBeNull();
});

it("splits the steps into runs", () => {
  const second = {
    ...steps[0],
    step_id: 4,
    thread_id: "thread-2",
    kind: "error" as const,
    text: "The run failed: The model is down",
  };
  render(<Steps steps={[...steps, second]} working={false} />);
  expect(screen.getByRole("heading", { name: "Run 1" })).toBeDefined();
  expect(screen.getByRole("heading", { name: "Run 2" })).toBeDefined();
  expect(
    within(screen.getByRole("list", { name: "Run 2" })).getByText("Error"),
  ).toBeDefined();
});

it("says when the agent is working", () => {
  render(<Steps steps={[]} working={true} />);
  expect(screen.getByRole("status").textContent).toBe("The agent is working…");
  expect(screen.queryByText(/hasn't worked/)).toBeNull();
});
