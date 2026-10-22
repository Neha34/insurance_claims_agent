import type { Decision, Status, StepKind } from "./api";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const money = (amount: number) => dollars.format(amount);

export const when = (timestamp: string) =>
  new Date(timestamp).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const label = (name: string) =>
  name.charAt(0).toUpperCase() + name.slice(1).replaceAll("_", " ");

export const STATUSES: Record<Status, string> = {
  waiting: "Waiting",
  in_progress: "In progress",
  waiting_for_sign_off: "Waiting for sign-off",
  decided: "Decided",
};

export const DECISIONS: Record<Decision, string> = {
  approve: "Approve",
  decline: "Decline",
  refer: "Refer",
};

export const STEP_KINDS: Record<StepKind, string> = {
  tool_call: "Calls",
  tool_result: "Result",
  message: "Says",
  error: "Error",
};
