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

export interface Item {
  description: string;
  category: string;
  amount: number;
}

export interface ClaimDocument {
  name: string;
  type: string;
  content: string;
}

export interface DecisionRecord {
  decision: Decision;
  payout: number;
  reason: string;
  policy_section: string;
  decided_at: string;
}

export interface SignOff {
  handler_id: string;
  name: string;
  signed_off_at: string;
}

export interface Payment {
  amount: number;
  paid_at: string;
}

export interface Claim {
  claim_id: string;
  policy_id: string;
  customer_id: string;
  claim_type: string;
  submitted_on: string;
  incident_date: string;
  incident_location: string;
  summary: string;
  story: string;
  items: Item[];
  amount_claimed: number;
  documents: ClaimDocument[];
  status: Status;
  thread_id: string | null;
  decision: DecisionRecord | null;
  sign_off: SignOff | null;
  payment: Payment | null;
}

export interface Policy {
  policy_id: string;
  plan: string;
  add_ons: string[];
  purchased_on: string;
  sold_through: string;
  trip: {
    destination: string;
    departs_on: string;
    returns_on: string;
    trip_cost: number;
  };
  travelers: string[];
  plan_limits: { name: string; deductible: number };
}

export interface PreviousClaim {
  claim_id: string;
  filed_on: string;
  claim_type: string;
  summary: string;
  outcome: string;
  amount_paid: number;
}

export interface ClaimHistory {
  customer_id: string;
  name: string;
  customer_since: string;
  previous_claims: PreviousClaim[];
}

export type StepKind = "message" | "tool_call" | "tool_result" | "error";

export interface Step {
  step_id: number;
  thread_id: string;
  kind: StepKind;
  text: string;
  created_at: string;
}

export interface Handler {
  handler_id: string;
  name: string;
  role: string;
  can_approve_over_limit: boolean;
}

export interface Run {
  claim_id: string;
  thread_id: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok)
    throw new Error(`The API answered ${String(response.status)}`);
  return (await response.json()) as T;
}

const post = <T>(path: string, body?: object) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });

export const listClaims = () => request<ClaimSummary[]>("/claims");
export const getClaim = (claimId: string) =>
  request<Claim>(`/claims/${claimId}`);
export const getPolicy = (policyId: string) =>
  request<Policy>(`/policies/${policyId}`);
export const getClaimHistory = (customerId: string) =>
  request<ClaimHistory>(`/customers/${customerId}/claims`);
export const listSteps = (claimId: string) =>
  request<Step[]>(`/claims/${claimId}/steps`);
export const startRun = (claimId: string) =>
  post<Run>(`/claims/${claimId}/runs`);
export const workQueue = () => post<{ claim_ids: string[] }>("/queue/runs");
export const listHandlers = () => request<Handler[]>("/handlers");
export const signOff = (claimId: string, handlerId: string) =>
  post<Claim>(`/claims/${claimId}/sign-off`, { handler_id: handlerId });
export const getInstructions = () =>
  request<{ instructions: string }>("/instructions");
