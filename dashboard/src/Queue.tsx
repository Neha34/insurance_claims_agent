import { useEffect, useState } from "react";
import { listClaims, type ClaimSummary, type Status } from "./api";
import { DECISIONS, STATUSES, label, money } from "./format";

export function Queue() {
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listClaims()
      .then(setClaims)
      .catch(() => {
        setError("The queue could not be loaded");
      });
  }, []);

  if (error) return <p className="alert">{error}</p>;
  if (!claims) return <p className="muted">Loading the queue…</p>;

  const count = (status: Status) =>
    claims.filter((claim) => claim.status === status).length;

  return (
    <>
      <section className="tiles" aria-label="Where the claims stand">
        {Object.entries(STATUSES).map(([status, name]) => (
          <div className="tile" key={status}>
            <span className="muted">{name}</span>
            <strong>{count(status as Status)}</strong>
          </div>
        ))}
      </section>
      <section className="panel">
        <div className="toolbar">
          <h2>The queue</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Summary</th>
              <th className="number">Claimed</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.claim_id}>
                <td className="mono">{claim.claim_id}</td>
                <td>{claim.customer_name}</td>
                <td>{label(claim.claim_type)}</td>
                <td>{claim.summary}</td>
                <td className="number">{money(claim.amount_claimed)}</td>
                <td className="mono">{claim.submitted_on}</td>
                <td>
                  <span className={`badge ${claim.status}`}>
                    {STATUSES[claim.status]}
                  </span>
                </td>
                <td>
                  {claim.decision && (
                    <span className={`badge ${claim.decision}`}>
                      {DECISIONS[claim.decision]}
                      {claim.payout ? `, ${money(claim.payout)}` : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
