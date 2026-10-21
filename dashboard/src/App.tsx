import { Queue } from "./Queue";

export function App() {
  return (
    <>
      <header className="header">
        <a className="brand" href="#/">
          UnderCover<em>Claims</em>
        </a>
      </header>
      <main>
        <Queue />
      </main>
    </>
  );
}
