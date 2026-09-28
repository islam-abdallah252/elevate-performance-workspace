import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: { baseURL: "http://localhost:5173", trace: "on-first-retry" },
  webServer: {
    command: "npm run seed && npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
