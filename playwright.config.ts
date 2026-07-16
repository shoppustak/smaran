import { defineConfig } from "@playwright/test";

const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: "npx pnpm --dir code --filter @workspace/api-server run dev",
    env: {
      PORT: String(PORT),
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://localhost/smaran_dev",
      SENTRY_DSN: process.env.SENTRY_DSN,
      WHATSAPP_VERIFY_TOKEN: "e2e-test-verify-token",
      // Must match TEST_APP_SECRET in tests/api/helpers/webhook.ts — the suite
      // signs its webhook payloads so the real HMAC path is exercised rather
      // than bypassed. No real Meta App Secret is needed to run the tests.
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET || "e2e-test-app-secret",
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || "e2e-local-key",
      CRON_SECRET: process.env.CRON_SECRET || "e2e-local-key",
    },
    url: `${BASE_URL}/api/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
