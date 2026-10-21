import { useCallback, useEffect, useState } from "react";

export const POLL_MS = 1000;

// Loads data, and loads it again every second while `keepPolling` says so.
// Both functions must keep their identity between renders.
export function usePolled<T>(
  load: () => Promise<T>,
  keepPolling: (data: T) => boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [loads, setLoads] = useState(0);

  useEffect(() => {
    let current = true;
    load()
      .then((next) => {
        if (current) setData(next);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [load, loads]);

  useEffect(() => {
    if (data === null || !keepPolling(data)) return;
    const timer = setTimeout(() => {
      setLoads((n) => n + 1);
    }, POLL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [data, keepPolling]);

  const reload = useCallback(() => {
    setLoads((n) => n + 1);
  }, []);

  return { data, failed, reload };
}
