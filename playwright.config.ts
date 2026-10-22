import { defineConfig } from "@playwright/test";

// The tests run their own backend and dashboard, apart from `npm run dev`,
// with a throwaway database and the stub agent.
const API = "http://127.0.0.1:8001";

export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e/test-results",
  reporter: "list",
  workers: 1,
  use: { baseURL: "http://localhost:5174" },
  webServer: [
    {
      command: "uv run -m uvicorn backend.tests.e2e_app:app --port 8001",
      url: `${API}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: "npx vite dashboard --port 5174 --strictPort",
      url: "http://localhost:5174",
      reuseExistingServer: false,
      env: { API_URL: API },
    },
  ],
});
