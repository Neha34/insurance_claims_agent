import type { Claim, ClaimHistory, Policy, Step } from "./api";

export const claim: Claim = {
  claim_id: "CLM-1001",
  policy_id: "POL-2001",
  customer_id: "CUS-3001",
  claim_type: "trip_delay",
  submitted_on: "2026-06-24",
  incident_date: "2026-06-18",
  incident_location: "Rome, Italy",
  summary: "Flight home canceled by the airline, rebooked the next morning",
  story: "My flight home from Rome on June 18 was canceled by Meridian Air.",
  items: [
    {
      description: "Airport hotel, one night",
      category: "accommodation",
      amount: 245,
    },
    { description: "Dinner and breakfast", category: "meals", amount: 95 },
    { description: "Taxis", category: "transport", amount: 80 },
  ],
  amount_claimed: 420,
  documents: [
    {
      name: "Meridian Air cancellation notice",
      type: "carrier_report",
      content: "Flight MA 611 was canceled because of crew availability.",
    },
  ],
  status: "waiting",
  thread_id: null,
  decision: null,
  sign_off: null,
  payment: null,
};

export const approved: Claim = {
  ...claim,
  status: "decided",
  thread_id: "thread-1",
  decision: {
    decision: "approve",
    payout: 420,
    reason: "The airline canceled the flight for a crew problem.",
    policy_section: "Section 3, Trip Delay",
    decided_at: "2026-10-21T23:08:12+00:00",
  },
  payment: { amount: 420, paid_at: "2026-10-21T23:08:13+00:00" },
};

export const policy: Policy = {
  policy_id: "POL-2001",
  plan: "premium",
  add_ons: ["electronics_plus"],
  purchased_on: "2026-04-22",
  sold_through: "Meridian Air checkout",
  trip: {
    destination: "Rome, Italy",
    departs_on: "2026-06-10",
    returns_on: "2026-06-18",
    trip_cost: 3100,
  },
  travelers: ["Maya Patel"],
  plan_limits: { name: "UnderCover Premium", deductible: 50 },
};

export const history: ClaimHistory = {
  customer_id: "CUS-3001",
  name: "Maya Patel",
  customer_since: "2023-04-11",
  previous_claims: [
    {
      claim_id: "CLM-0412",
      filed_on: "2024-08-19",
      claim_type: "baggage_delay",
      summary: "Checked bag arrived 30 hours late in Lisbon",
      outcome: "approved",
      amount_paid: 140,
    },
  ],
};

export const steps: Step[] = [
  {
    step_id: 1,
    thread_id: "thread-1",
    kind: "tool_call",
    text: 'get_claim(claim_id="CLM-1001")',
    created_at: "2026-10-21T23:08:10+00:00",
  },
  {
    step_id: 2,
    thread_id: "thread-1",
    kind: "tool_result",
    text: 'get_claim: {"claim_id":"CLM-1001"}',
    created_at: "2026-10-21T23:08:11+00:00",
  },
  {
    step_id: 3,
    thread_id: "thread-1",
    kind: "message",
    text: "The claim is approved.",
    created_at: "2026-10-21T23:08:12+00:00",
  },
];
