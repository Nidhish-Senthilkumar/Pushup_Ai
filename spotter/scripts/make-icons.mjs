// Renders public/icon.svg to the PNG sizes browsers need to install the app
// (Chrome wants 192 and 512; iOS uses apple-touch-icon at 180). Run once after
// changing the icon: node scripts/make-icons.mjs
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icon.svg", "utf8");
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
for (const [size, name, pad] of [
  [192, "icon-192.png", 0],
  [512, "icon-512.png", 0],
  [512, "icon-maskable-512.png", 0.12],
  [180, "apple-touch-icon.png", 0],
]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - 2 * pad));
  await page.setContent(
    `<html><body style="margin:0;background:${pad ? "#d4ff3a" : "transparent"};display:grid;place-items:center;width:${size}px;height:${size}px">` +
      svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `) +
      "</body></html>",
  );
  await page.screenshot({ path: `public/${name}`, omitBackground: !pad });
  console.log("wrote", name);
}
await browser.close();
