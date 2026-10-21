import type { Step } from "./api";
import { STEP_KINDS } from "./format";

export function Steps({
  steps,
  working,
}: Readonly<{ steps: Step[]; working: boolean }>) {
  const runs = [...new Set(steps.map((step) => step.thread_id))];
  return (
    <section className="panel" aria-labelledby="steps-heading">
      <h2 id="steps-heading">What the agent did</h2>
      {steps.length === 0 && !working && (
        <p className="muted">The agent hasn&apos;t worked on this claim yet.</p>
      )}
      {runs.map((thread, index) => (
        <div key={thread}>
          {runs.length > 1 && <h3 className="run">Run {index + 1}</h3>}
          <ol className="steps" aria-label={`Run ${String(index + 1)}`}>
            {steps
              .filter((step) => step.thread_id === thread)
              .map((step) => (
                <li key={step.step_id} className={`step ${step.kind}`}>
                  <span className="step-kind">{STEP_KINDS[step.kind]}</span>
                  <span className={step.kind.startsWith("tool") ? "code" : ""}>
                    {step.text}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      ))}
      {working && (
        <p className="muted" role="status">
          The agent is working…
        </p>
      )}
    </section>
  );
}
