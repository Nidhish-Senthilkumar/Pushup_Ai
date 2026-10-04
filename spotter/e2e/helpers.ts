import type { Page } from "@playwright/test";
import path from "node:path";

/** Chrome's fake camera playing real exercise footage (scripts/fetch-test-videos.sh). */
const HERE = path.dirname(new URL(import.meta.url).pathname);
export const fake = (name: string) => path.join(HERE, ".cache", "fake", name);

export function camera(file: string) {
  return {
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${fake(file)}`, "--autoplay-policy=no-user-gesture-required"],
    },
    permissions: ["camera"],
  };
}

export async function skipOnboarding(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("spotter.v1", JSON.stringify({ version: 1, profile: { name: "Test", onboarded: true }, settings: { voice: false, sounds: false } }));
  });
}
