import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/preview",
  use: { baseURL: "http://127.0.0.1:3108" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3108",
    url: "http://127.0.0.1:3108",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VERCEL: "1",
      DATABASE_URL: "file:./data/preview-do-not-create.db",
      TURSO_DATABASE_URL: "",
    },
  },
});
