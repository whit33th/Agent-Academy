import { _electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { installCollectionFixtures } from "./collection-fixtures.mjs";

const output = path.resolve("outputs/scroll-qa");
await mkdir(output, { recursive: true });
const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);
const executablePath = path.resolve(
  process.argv.slice(2).find((arg) => arg.endsWith(".exe")) ??
    "release/win-unpacked/Agent Academy.exe",
);
const maps = [
  "ascent",
  "breeze",
  "fracture",
  "haven",
  "lotus",
  "pearl",
  "split",
];
const evidence = { executablePath, fixtureBackend: true, runs: [] };
for (const scale of process.argv.includes("--quick") ? [1] : [1, 1.25, 1.5]) {
  const profile = await mkdtemp(path.join(output, "profile-"));
  const app = await _electron.launch({
    executablePath,
    args: [
      `--user-data-dir=${profile}`,
      `--force-device-scale-factor=${scale}`,
    ],
    env: { ...process.env, AGENT_ACADEMY_QA_HIDDEN: "1" },
    timeout: 60000,
  });
  let page;
  try {
    page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const fixtures = installCollectionFixtures(page.context(), catalog);
    await fixtures.ready;
    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.setContentSize(800, 640);
      window.showInactive();
    });
    await page.waitForURL("http://127.0.0.1:37491/", { timeout: 60000 });
    await page.evaluate(() =>
      localStorage.setItem(
        "vp_onboarding_v1",
        JSON.stringify({ version: 1, step: "done" }),
      ),
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: "Add Map", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const states = [];
    const dimensions = () =>
      page.evaluate(() => ({
        y: scrollY,
        height: innerHeight,
        content: document.documentElement.scrollHeight,
        bodyOverflow: document.body.style.overflow,
      }));
    async function wheel(name, direction = 1) {
      const before = await dimensions();
      expect(
        before.content - before.height,
        `${name} must actually overflow`,
      ).toBeGreaterThan(80);
      await page.mouse.move(400, 350);
      await expect
        .poll(
          async () => {
            await page.mouse.wheel(0, 300 * direction);
            return direction * ((await dimensions()).y - before.y);
          },
          { timeout: 4000, intervals: [100, 200, 400] },
        )
        .toBeGreaterThan(40);
      states.push({ name, before, after: await dimensions() });
    }
    async function bottom(name) {
      await page.mouse.move(400, 350);
      await expect
        .poll(
          async () => {
            await page.mouse.wheel(0, 100000);
            const state = await dimensions();
            return state.content - state.height - state.y;
          },
          { timeout: 5000, intervals: [100, 200, 400] },
        )
        .toBeLessThan(3);
      await page.screenshot({
        path: path.join(output, `${name}-${scale}.png`),
      });
    }
    let roster = [];
    async function selection() {
      await page.evaluate(
        (value) => {
          const key = "agent-academy:guest-selection:v1";
          const newValue = JSON.stringify(value);
          localStorage.setItem(key, newValue);
          window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
        },
        { maps: maps.map((mapSlug) => ({ mapSlug, hidden: false })), roster },
      );
    }
    // Let the initial 250ms resize debounce finish before account data arrives.
    await page.waitForTimeout(500);
    await selection();
    await expect(page.locator("a.map-select-card:visible")).toHaveCount(7);
    await wheel("late map selection before any resize");
    await bottom("maps-bottom");
    await page.locator('a[href="/ascent"]:visible').click();
    await expect(
      page.getByRole("button", { name: "Add agent", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    roster = Object.keys(catalog.agents).map((agentSlug) => ({
      mapSlug: "ascent",
      agentSlug,
      hidden: false,
    }));
    await selection();
    await expect(page.locator('a[href^="/ascent/"]:visible')).toHaveCount(
      roster.length,
    );
    await wheel("late agent selection");
    await bottom("agents-bottom");
    await expect(page.locator("html")).not.toHaveClass(/lenis-scrolling/);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
    await expect(dialog).toBeVisible();
    const backgroundY = (await dimensions()).y;
    await page.mouse.move(400, 350);
    await page.mouse.wheel(0, 500);
    await expect
      .poll(() => dialog.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(0);
    expect((await dimensions()).y).toBe(backgroundY);
    await dialog
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await expect.poll(async () => (await dimensions()).bodyOverflow).toBe("");
    await wheel("scroll restored after modal close", -1);
    fixtures.setEmptyFeed(true);
    fixtures.release();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await nav.getByRole("link", { name: "Feed", exact: true }).click();
    await expect(
      page.getByText("No public lineups yet", { exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    fixtures.setEmptyFeed(false);
    await expect(page.locator("article:visible")).toHaveCount(48);
    await wheel("empty Feed to populated Feed");
    await bottom("feed-bottom");
    await page
      .getByRole("button", { name: "Load more setups", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(96);
    await bottom("feed-pagination-bottom");
    fixtures.hold();
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await page.locator('a[href="/ascent"]:visible').click();
    await page.locator('a[href="/ascent/sova"]:visible').click();
    await expect(page.locator(".skeleton:visible").first()).toBeVisible();
    await page.waitForTimeout(500);
    fixtures.release();
    await expect(page.locator("article:visible")).toHaveCount(48);
    await wheel("late lineup subscription");
    await bottom("lineups-bottom");
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.locator("a.map-select-card:visible")).toHaveCount(7);
    await wheel("return to cached Home");
    for (const [width, height] of [
      [900, 900],
      [1440, 900],
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0].setContentSize(...size),
        [width, height],
      );
      await bottom(`maps-${width}-bottom`);
      await wheel(`maps at ${width}x${height}`, -1);
    }
    expect(errors).toEqual([]);
    evidence.runs.push({
      scale,
      states,
      modalScrollAndUnlock: true,
      cachedNavigation: true,
      paginationBottomReachable: true,
      pageErrors: errors,
    });
    console.log(`Scroll regression passed at scale ${scale}`);
  } catch (error) {
    if (page) {
      const dimensions = await page.evaluate(() => ({
        y: scrollY,
        viewport: innerHeight,
        rootHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        bodyRect: document.body.getBoundingClientRect().toJSON(),
        mainRects: [...document.querySelectorAll("main")].map((node) =>
          node.getBoundingClientRect().toJSON(),
        ),
        classes: document.documentElement.className,
      }));
      await writeFile(
        path.join(output, "failure.json"),
        JSON.stringify({ error: error.message, dimensions }, null, 2),
      );
      await page.screenshot({ path: path.join(output, "failure.png") });
      console.log(dimensions);
    }
    throw error;
  } finally {
    await app.close();
  }
}
await writeFile(
  path.join(output, "results.json"),
  JSON.stringify(evidence, null, 2),
);
