import type { Claim } from "./api";
import { DECISIONS, money, when } from "./format";

function PaymentLine({ claim }: Readonly<{ claim: Claim }>) {
  const { payment, sign_off: signOff, decision } = claim;
  if (payment)
    return (
      <p className="paid">
        Paid {money(payment.amount)} on {when(payment.paid_at)}
        {signOff && `, signed off by ${signOff.name}`}
      </p>
    );
  if (claim.status === "waiting_for_sign_off" && decision)
    return (
      <p className="waiting-note">
        The payment of {money(decision.payout)} waits for a handler&apos;s
        sign-off.
      </p>
    );
  if (decision?.decision === "approve")
    return <p className="muted">Not paid yet.</p>;
  return null;
}

export function DecisionPanel({ claim }: Readonly<{ claim: Claim }>) {
  const { decision } = claim;
  return (
    <section className="panel" aria-labelledby="decision-heading">
      <h2 id="decision-heading">The agent&apos;s decision</h2>
      {decision ? (
        <>
          <p className="decision">
            <span className={`badge ${decision.decision}`}>
              {DECISIONS[decision.decision]}
            </span>
            {decision.decision === "approve" && (
              <strong className="number">{money(decision.payout)}</strong>
            )}
          </p>
          <p>{decision.reason}</p>
          <p className="muted">{decision.policy_section}</p>
          <PaymentLine claim={claim} />
        </>
      ) : (
        <p className="muted">
          {claim.status === "in_progress"
            ? "The agent is working on this claim."
            : "The agent hasn't decided this claim yet."}
        </p>
      )}
    </section>
  );
}
