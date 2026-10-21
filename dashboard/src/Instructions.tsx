import { useEffect, useState } from "react";
import { getInstructions } from "./api";

export function Instructions() {
  const [instructions, setInstructions] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getInstructions()
      .then((answer) => {
        setInstructions(answer.instructions);
      })
      .catch(() => {
        setError("The instructions could not be loaded");
      });
  }, []);

  if (error) return <p className="alert">{error}</p>;
  if (instructions === null)
    return <p className="muted">Loading the instructions…</p>;

  return (
    <section className="panel" aria-labelledby="instructions-heading">
      <h2 id="instructions-heading">The agent&apos;s instructions</h2>
      <p className="muted">
        Read only. The agent reads this at the start of every run: its
        instructions, then the policy wording.
      </p>
      <pre className="instructions">{instructions}</pre>
    </section>
  );
}
