import { useSyncExternalStore } from "react";
import { ClaimPage } from "./ClaimPage";
import { Queue } from "./Queue";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

const currentHash = () => window.location.hash;

export function App() {
  const hash = useSyncExternalStore(subscribe, currentHash);
  const claimId = /^#\/claims\/(CLM-\d+)$/.exec(hash)?.[1];

  return (
    <>
      <header className="header">
        <a className="brand" href="#/">
          UnderCover<em>Claims</em>
        </a>
      </header>
      <main>
        {claimId ? <ClaimPage key={claimId} claimId={claimId} /> : <Queue />}
      </main>
    </>
  );
}
