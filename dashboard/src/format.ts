import type { Decision, Status } from "./api";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const money = (amount: number) => dollars.format(amount);

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
