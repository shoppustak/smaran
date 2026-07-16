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
      WHATSAPP_VERIFY_TOKEN: "e2e-test-verify-token",
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || "e2e-local-key",
      CRON_SECRET: process.env.CRON_SECRET || "e2e-local-key",
    },
    url: `${BASE_URL}/api/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
