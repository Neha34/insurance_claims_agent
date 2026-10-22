import { vi } from "vitest";

// Each route, such as "GET /api/claims", answers with what its function returns.
export function stubApi(routes: Record<string, () => unknown>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const route = `${init?.method ?? "GET"} ${url}`;
    if (!(route in routes))
      return Promise.resolve(new Response("{}", { status: 404 }));
    return Promise.resolve(new Response(JSON.stringify(routes[route]())));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
