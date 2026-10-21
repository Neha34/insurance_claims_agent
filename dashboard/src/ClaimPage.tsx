import { useCallback, useState } from "react";
import {
  getClaim,
  getClaimHistory,
  getPolicy,
  listSteps,
  startRun,
  type Claim,
  type ClaimHistory,
  type Policy,
  type Step,
} from "./api";
import { DecisionPanel } from "./DecisionPanel";
import { STATUSES, label } from "./format";
import { ClaimRecord, HistoryPanel, PolicyPanel } from "./Records";
import { Steps } from "./Steps";
import { usePolled } from "./usePolled";

interface ClaimPageData {
  claim: Claim;
  policy: Policy;
  history: ClaimHistory;
  steps: Step[];
}

async function loadClaimPage(claimId: string): Promise<ClaimPageData> {
  const claim = await getClaim(claimId);
  const [policy, history, steps] = await Promise.all([
    getPolicy(claim.policy_id),
    getClaimHistory(claim.customer_id),
    listSteps(claimId),
  ]);
  return { claim, policy, history, steps };
}

const inProgress = (page: ClaimPageData) => page.claim.status === "in_progress";

export function ClaimPage({ claimId }: Readonly<{ claimId: string }>) {
  const load = useCallback(() => loadClaimPage(claimId), [claimId]);
  const { data, failed, reload } = usePolled(load, inProgress);
  const [error, setError] = useState("");

  if (failed && !data)
    return <p className="alert">Claim {claimId} could not be loaded</p>;
  if (!data) return <p className="muted">Loading the claim…</p>;
  const { claim, policy, history, steps } = data;

  async function run() {
    setError("");
    try {
      await startRun(claim.claim_id);
      reload();
    } catch {
      setError("The agent could not be started on this claim");
    }
  }

  return (
    <>
      <a className="back" href="#/">
        Back to the queue
      </a>
      <section className="panel claim-head">
        <div>
          <p className="mono muted">{claim.claim_id}</p>
          <h1>{claim.summary}</h1>
          <p className="muted">
            {label(claim.claim_type)} for {history.name}, in{" "}
            {claim.incident_location} on {claim.incident_date}
          </p>
        </div>
        <div className="claim-actions">
          <span className={`badge ${claim.status}`}>
            {STATUSES[claim.status]}
          </span>
          {claim.status === "waiting" && (
            <button
              className="button"
              onClick={() => {
                void run();
              }}
            >
              Run the agent
            </button>
          )}
        </div>
      </section>
      {error && <p className="alert">{error}</p>}
      <div className="columns">
        <div className="stack">
          <ClaimRecord claim={claim} />
        </div>
        <div className="stack">
          <DecisionPanel claim={claim} onChange={reload} />
          <Steps steps={steps} working={claim.status === "in_progress"} />
          <PolicyPanel policy={policy} />
          <HistoryPanel history={history} />
        </div>
      </div>
    </>
  );
}
