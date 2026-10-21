import type { Claim, ClaimHistory, Policy } from "./api";
import { label, money } from "./format";

export function ClaimRecord({ claim }: Readonly<{ claim: Claim }>) {
  return (
    <>
      <section className="panel" aria-labelledby="story-heading">
        <h2 id="story-heading">The customer&apos;s story</h2>
        <p className="story">{claim.story}</p>
        <dl className="facts">
          <dt>Incident</dt>
          <dd className="mono">{claim.incident_date}</dd>
          <dt>Submitted</dt>
          <dd className="mono">{claim.submitted_on}</dd>
        </dl>
      </section>
      <section className="panel" aria-labelledby="items-heading">
        <h2 id="items-heading">What is claimed</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th className="number">Amount</th>
            </tr>
          </thead>
          <tbody>
            {claim.items.map((item) => (
              <tr key={item.description}>
                <td>{item.description}</td>
                <td>{label(item.category)}</td>
                <td className="number">{money(item.amount)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={2}>Total claimed</td>
              <td className="number">{money(claim.amount_claimed)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section className="panel" aria-labelledby="documents-heading">
        <h2 id="documents-heading">Documents</h2>
        {claim.documents.map((document) => (
          <article className="document" key={document.name}>
            <h3>{document.name}</h3>
            <p className="muted">{label(document.type)}</p>
            <p>{document.content}</p>
          </article>
        ))}
      </section>
    </>
  );
}

export function PolicyPanel({ policy }: Readonly<{ policy: Policy }>) {
  return (
    <section className="panel" aria-labelledby="policy-heading">
      <h2 id="policy-heading">The policy</h2>
      <dl className="facts">
        <dt>Policy</dt>
        <dd className="mono">{policy.policy_id}</dd>
        <dt>Plan</dt>
        <dd>{policy.plan_limits.name}</dd>
        <dt>Add-ons</dt>
        <dd>
          {policy.add_ons.length
            ? policy.add_ons.map(label).join(", ")
            : "None"}
        </dd>
        <dt>Trip</dt>
        <dd>
          {policy.trip.destination},{" "}
          <span className="mono">
            {policy.trip.departs_on} to {policy.trip.returns_on}
          </span>
        </dd>
        <dt>Trip cost</dt>
        <dd className="mono">{money(policy.trip.trip_cost)}</dd>
        <dt>Travelers</dt>
        <dd>{policy.travelers.join(", ")}</dd>
        <dt>Bought</dt>
        <dd>
          <span className="mono">{policy.purchased_on}</span>, through{" "}
          {policy.sold_through}
        </dd>
      </dl>
    </section>
  );
}

export function HistoryPanel({ history }: Readonly<{ history: ClaimHistory }>) {
  return (
    <section className="panel" aria-labelledby="history-heading">
      <h2 id="history-heading">Earlier claims</h2>
      <p className="muted">
        {history.name}, a customer since {history.customer_since}
      </p>
      {history.previous_claims.length === 0 ? (
        <p className="muted">No earlier claims.</p>
      ) : (
        <ul className="history">
          {history.previous_claims.map((previous) => (
            <li key={previous.claim_id}>
              <span className="mono">{previous.claim_id}</span>{" "}
              <span className="muted">{previous.filed_on}</span>
              <br />
              {label(previous.claim_type)}: {previous.summary}.{" "}
              {label(previous.outcome)}, {money(previous.amount_paid)} paid.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
