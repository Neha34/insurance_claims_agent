export type Status =
  "waiting" | "in_progress" | "waiting_for_sign_off" | "decided";

export type Decision = "approve" | "decline" | "refer";

export interface ClaimSummary {
  claim_id: string;
  customer_name: string;
  claim_type: string;
  summary: string;
  amount_claimed: number;
  submitted_on: string;
  status: Status;
  decision: Decision | null;
  payout: number | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok)
    throw new Error(`The API answered ${String(response.status)}`);
  return (await response.json()) as T;
}

export const listClaims = () => request<ClaimSummary[]>("/claims");
