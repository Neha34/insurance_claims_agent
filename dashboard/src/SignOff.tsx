import { useEffect, useState } from "react";
import { listHandlers, signOff, type Handler } from "./api";

export function SignOff({
  claimId,
  onSignedOff,
}: Readonly<{ claimId: string; onSignedOff: () => void }>) {
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [handlerId, setHandlerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listHandlers()
      .then((all) => {
        setHandlers(all.filter((handler) => handler.can_approve_over_limit));
      })
      .catch(() => {
        setError("The handlers could not be loaded");
      });
  }, []);

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signOff(claimId, handlerId);
      onSignedOff();
    } catch {
      setError("The sign-off was refused");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="sign-off"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <label htmlFor="handler">Signing handler</label>
      <select
        id="handler"
        value={handlerId}
        required
        onChange={(event) => {
          setHandlerId(event.target.value);
        }}
      >
        <option value="">Choose a handler</option>
        {handlers.map((handler) => (
          <option key={handler.handler_id} value={handler.handler_id}>
            {handler.name}, {handler.role}
          </option>
        ))}
      </select>
      <button className="button" type="submit" disabled={busy || !handlerId}>
        Sign off and pay
      </button>
      {error && <p className="alert">{error}</p>}
    </form>
  );
}
