import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Automated accessibility checks (WCAG 2.1 A and AA rules axe can test). */
const PAGES = ["/", "/train", "/exercise/pushup", "/plans", "/progress", "/assess", "/about", "/settings", "/analyze", "/lab"];

test("no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/?skip#/settings");
  await page.getByTestId("load-sample").click();
  const all: string[] = [];
  for (const p of PAGES) {
    await page.goto(`/?skip#${p}`);
    await page.waitForTimeout(400);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of r.violations) all.push(`${p}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")} :: ${v.nodes[0]?.failureSummary?.split("\n")[1] ?? ""}`);
  }
  console.log(all.join("\n"));
  expect(all).toEqual([]);
});
