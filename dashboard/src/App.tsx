import { useSyncExternalStore } from "react";
import { ClaimPage } from "./ClaimPage";
import { Instructions } from "./Instructions";
import { Queue } from "./Queue";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

const currentHash = () => window.location.hash;

function Page({ hash }: Readonly<{ hash: string }>) {
  const claimId = /^#\/claims\/(CLM-\d+)$/.exec(hash)?.[1];
  if (claimId) return <ClaimPage key={claimId} claimId={claimId} />;
  if (hash === "#/instructions") return <Instructions />;
  return <Queue />;
}

export function App() {
  const hash = useSyncExternalStore(subscribe, currentHash);
  const onInstructions = hash === "#/instructions";

  return (
    <>
      <header className="header">
        <a className="brand" href="#/">
          UnderCover<em>Claims</em>
        </a>
        <nav className="nav" aria-label="Pages">
          <a href="#/" aria-current={onInstructions ? undefined : "page"}>
            Queue
          </a>
          <a
            href="#/instructions"
            aria-current={onInstructions ? "page" : undefined}
          >
            Instructions
          </a>
        </nav>
      </header>
      <main>
        <Page hash={hash} />
      </main>
    </>
  );
}
