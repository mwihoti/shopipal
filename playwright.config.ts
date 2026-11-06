import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3107", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "npm run db:migrate && npm run db:seed && npm run dev -- --hostname 127.0.0.1 --port 3107",
    url: "http://127.0.0.1:3107",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: "file:./data/browser.db",
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: "sandbox-browser-test",
      PAYPAL_ENVIRONMENT: "SANDBOX",
      APP_URL: "http://127.0.0.1:3107",
      DASHBOARD_PASSPHRASE: "browser-test-passphrase",
      SESSION_SECRET: "browser-test-secret-at-least-32-characters",
    },
  },
});
