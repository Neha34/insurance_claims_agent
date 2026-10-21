export interface Claim {
  reference: string;
  policy_number: string;
  amount: number;
  description: string;
}

export interface Triage {
  reference: string;
  decision: "approve" | "review" | "investigate";
  reason: string;
}

export async function triageClaim(claim: Claim): Promise<Triage> {
  const response = await fetch("/api/claims/triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(claim),
  });
  if (!response.ok)
    throw new Error(`The API answered ${String(response.status)}`);
  return (await response.json()) as Triage;
}
