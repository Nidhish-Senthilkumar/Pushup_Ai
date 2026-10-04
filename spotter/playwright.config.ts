import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests run in the system's own Chrome against the production
 * build, with a fake camera fed from real exercise footage where a test needs
 * one. Footage is downloaded by scripts/fetch-test-videos.sh (openly licensed,
 * from Wikimedia Commons) into e2e/.cache, which is not committed.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4180",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chrome", use: { channel: "chrome" } },
    { name: "webkit", use: { browserName: "webkit" }, testMatch: /(pages|webkitPose)\.spec\.ts/ },
  ],
  webServer: [{ command: "npm run preview", url: "http://localhost:4180", reuseExistingServer: true, timeout: 60_000 }],
});
