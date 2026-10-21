import { useState } from "react";
import { triageClaim, type Triage } from "./api";

const EMPTY = {
  reference: "",
  policy_number: "",
  amount: "",
  description: "",
};

export function App() {
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState<Triage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const field = (name: keyof typeof EMPTY) => ({
    id: name,
    value: form[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [name]: event.target.value });
    },
  });

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await triageClaim({ ...form, amount: Number(form.amount) }));
    } catch {
      setError("The claim could not be triaged");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Insurance Claims Agent</h1>
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <p>
          <label htmlFor="reference">Reference</label>
          <input {...field("reference")} required />
        </p>
        <p>
          <label htmlFor="policy_number">Policy number</label>
          <input {...field("policy_number")} required />
        </p>
        <p>
          <label htmlFor="amount">Amount</label>
          <input
            {...field("amount")}
            type="number"
            min="0"
            step="0.01"
            required
          />
        </p>
        <p>
          <label htmlFor="description">Description</label>
          <input {...field("description")} required />
        </p>
        <button type="submit" disabled={busy}>
          {busy ? "Triaging…" : "Triage"}
        </button>
      </form>
      {result && (
        <p>
          Decision: {result.decision} — {result.reason}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
