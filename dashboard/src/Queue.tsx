import { useCallback, useState } from "react";
import { listClaims, workQueue, type ClaimSummary, type Status } from "./api";
import { DECISIONS, STATUSES, label, money } from "./format";
import { usePolled } from "./usePolled";

export function Queue() {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const keepPolling = useCallback(
    (claims: ClaimSummary[]) =>
      claims.some(
        (claim) =>
          claim.status === "in_progress" ||
          (working && claim.status === "waiting"),
      ),
    [working],
  );
  const { data: claims, failed, reload } = usePolled(listClaims, keepPolling);

  async function work() {
    setError("");
    try {
      await workQueue();
      setWorking(true);
      reload();
    } catch {
      setError("The agent could not be started on the queue");
    }
  }

  if (failed && !claims)
    return <p className="alert">The queue could not be loaded</p>;
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
      {error && <p className="alert">{error}</p>}
      <section className="panel">
        <div className="toolbar">
          <h2>The queue</h2>
          <button
            className="button"
            disabled={count("waiting") === 0}
            onClick={() => {
              void work();
            }}
          >
            Work the queue
          </button>
        </div>
        <div className="scroll">
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
                  <td>
                    <a className="mono" href={`#/claims/${claim.claim_id}`}>
                      {claim.claim_id}
                    </a>
                  </td>
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
        </div>
      </section>
    </>
  );
}
