import { installCollectionFixtures } from "./collection-fixtures.mjs";
import { _electron, expect } from "@playwright/test";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { checkAccountProfile } from "./account-profile-qa.mjs";
import {
  checkSettings,
  checkMapConfirmation,
  checkAgentConfirmation,
} from "./settings-qa.mjs";

const root = process.cwd();
const output = path.join(root, "outputs", "desktop-qa");
await mkdir(output, { recursive: true });
const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);
const executablePath = path.resolve(
  process.argv.slice(2).find((arg) => arg.endsWith(".exe")) ??
    "release/win-unpacked/Agent Academy.exe",
);
const origin = "http://127.0.0.1:37491";
const evidence = {
  catalogVersion: catalog.gameVersion,
  fixtureBackend: true,
  runs: [],
};
let savedProfile;

async function quit(app) {
  const child = app.process();
  if (child.exitCode !== null) return;
  let forced = false;
  const watchdog = setTimeout(() => {
    forced = true;
    child.kill();
  }, 10000);
  const exited = new Promise((resolve) => child.once("exit", resolve));
  await app.close().catch(() => undefined);
  const finished = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 10000)),
  ]);
  if (!finished || forced) {
    child.kill();
    throw new Error("Explicit Quit did not terminate the application");
  }
  clearTimeout(watchdog);
}

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "video { visibility: hidden !important }",
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.images]
          .filter((image) => {
            const rect = image.getBoundingClientRect();
            return (
              rect.top < innerHeight &&
              rect.bottom > 0 &&
              rect.left < innerWidth &&
              rect.right > 0 &&
              rect.width > 0
            );
          })
          .every((image) => image.complete && image.naturalWidth > 0),
      ),
    )
    .toBe(true);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images]
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          return (
            rect.top < innerHeight &&
            rect.bottom > 0 &&
            rect.left < innerWidth &&
            rect.right > 0 &&
            rect.width > 0
          );
        })
        .map((image) => image.decode().catch(() => {})),
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  const bytes = await page.screenshot({
    path: path.join(output, `${name}.png`),
    animations: "disabled",
  });
  const decoded = PNG.sync.read(bytes);
  if (name === "home-1440-1") {
    const baseline = await readFile(
      path.join(root, "outputs/qa-baseline/home.png"),
    ).catch(() => null);
    if (baseline) {
      const previous = PNG.sync.read(baseline);
      if (
        previous.width === decoded.width &&
        previous.height === decoded.height
      ) {
        const diff = new PNG({ width: decoded.width, height: decoded.height });
        const changed = pixelmatch(
          previous.data,
          decoded.data,
          diff.data,
          decoded.width,
          decoded.height,
          { threshold: 0.1 },
        );
        await writeFile(
          path.join(output, "home-baseline-diff.png"),
          PNG.sync.write(diff),
        );
        evidence.baselineChangedPixelPercent =
          (100 * changed) / (decoded.width * decoded.height);
      }
    }
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  return { width: decoded.width, height: decoded.height };
}

async function choose(page, label, option) {
  await page
    .getByRole("combobox", { name: label, exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function canvasPixels(page) {
  return page
    .locator("canvas")
    .first()
    .evaluate((canvas) => {
      const data = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let index = 3; index < data.length; index += 4)
        if (data[index]) count++;
      return count;
    });
}

for (const scale of process.argv.includes("--quick") ? [1] : [1, 1.25, 1.5]) {
  const profile = await mkdtemp(path.join(output, `profile-${scale}-`));
  const env = { ...process.env, AGENT_ACADEMY_QA_HIDDEN: "1" };
  delete env.ELECTRON_RUN_AS_NODE;
  const started = performance.now();
  const app = await _electron.launch({
    executablePath,
    args: [
      `--force-device-scale-factor=${scale}`,
      `--user-data-dir=${profile}`,
    ],
    env,
    timeout: 60000,
  });
  try {
    const log = path.join(output, `runtime-${scale}.log`);
    await writeFile(log, "");
    app.process().stderr?.on("data", (data) => {
      void appendFile(log, data);
    });
    app.process().stdout?.on("data", (data) => {
      void appendFile(log, data);
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(20000);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].showInactive(),
    );
    await page.waitForURL(`${origin}/`, { waitUntil: "load", timeout: 60000 });
    page.on("console", (message) => {
      if (message.type() === "error")
        void appendFile(log, message.text() + "\n");
    });
    page.on("pageerror", (error) => {
      void appendFile(log, error.stack + "\n");
    });
    const fixtures = installCollectionFixtures(page.context(), catalog);
    await fixtures.ready;
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { name: "Select Map", exact: true })
      .waitFor();
    const startupMs = performance.now() - started;
    const skip = page.getByRole("button", { name: "Skip tour", exact: true });
    if (await skip.isVisible()) await skip.click();
    const errors = [];
    const nativeDialogs = [];
    page.on("dialog", (dialog) => {
      nativeDialogs.push(dialog.type());
      void dialog.dismiss();
    });
    page.on("pageerror", (error) => errors.push(error.message));
    const run = { scale, startupMs, screens: [], checks: [] };
    await expect(page.locator("a.map-select-card:visible")).toHaveCount(0);
    await capture(page, `empty-home-${scale}`);
    await page.getByRole("button", { name: "Add Map", exact: true }).click();
    await page.getByRole("button", { name: "Add Ascent", exact: true }).click();
    await expect(page.locator('a[href="/ascent"]:visible')).toBeVisible();
    await capture(page, `partial-home-${scale}`);
    await checkMapConfirmation(page, capture, scale);
    const homeNavigation = await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .boundingBox();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('a[href="/ascent"]:visible').click();
    expect(
      (
        await page
          .getByRole("navigation", { name: "Main navigation", exact: true })
          .boundingBox()
      ).x,
    ).toBe(homeNavigation.x);
    await expect(page.locator('a[href^="/ascent/"]:visible')).toHaveCount(0);
    await capture(page, `empty-roster-${scale}`);
    await page.getByRole("button", { name: "Add agent", exact: true }).click();
    await page.getByRole("button", { name: "Add Sova", exact: true }).click();
    await expect(page.locator('a[href^="/ascent/"]:visible')).toHaveCount(1);
    await checkAgentConfirmation(page);

    // Seed all but the last catalog entries, then add the last through the real UI.
    // This checks the exhausted-picker state without clicking every catalog item.
    await page.evaluate(
      (catalog) =>
        localStorage.setItem(
          "agent-academy:guest-selection:v1",
          JSON.stringify({
            maps: Object.keys(catalog.maps)
              .filter((slug) => slug !== "haven")
              .map((mapSlug) => ({ mapSlug, hidden: false })),
            roster: Object.keys(catalog.agents)
              .filter((slug) => slug !== "sova")
              .map((agentSlug) => ({
                mapSlug: "ascent",
                agentSlug,
                hidden: false,
              })),
          }),
        ),
      catalog,
    );
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Add Map", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add Ascent", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Add Haven", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add Map", exact: true }),
    ).toHaveCount(0);
    await page.locator('a[href="/ascent"]:visible').click();
    await page.getByRole("button", { name: "Add agent", exact: true }).click();
    await page.getByRole("button", { name: "Add Sova", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add agent", exact: true }),
    ).toHaveCount(0);
    run.checks.push(
      "empty defaults, manual map/agent additions, persisted choices, exhausted pickers hidden",
    );
    for (const size of [
      { width: 1440, height: 900 },
      { width: 900, height: 900 },
      { width: 800, height: 640 },
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0].setContentSize(
            size.width,
            size.height,
          ),
        size,
      );
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await expect(page.locator('a[href="/ascent"]:visible')).toBeVisible();
      await expect(page.locator('a[href="/ascent"]:visible')).toHaveCount(1);
      expect(await page.locator(".skeleton:visible").count()).toBe(0);
      expect(
        [...fixtures.queries].some((query) => query.endsWith("listEnabled")),
      ).toBe(false);
      run.screens.push(await capture(page, `home-${size.width}-${scale}`));
      await page.locator('a[href="/ascent"]:visible').click();
      await page
        .getByRole("heading", { name: "Ascent", exact: true })
        .waitFor();
      await expect(page.locator('a[href^="/ascent/"]:visible')).toHaveCount(29);
      expect(await page.locator(".skeleton:visible").count()).toBe(0);
      await capture(page, `agents-${size.width}-${scale}`);
    }
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1440, 900),
    );
    const boardStart = performance.now();
    await page.getByRole("button", { name: "Board", exact: true }).click();
    const board = page.getByRole("dialog", {
      name: "Tactical board",
      exact: true,
    });
    await expect(board).toBeVisible();
    const titlebar = page.getByRole("banner", { name: "Window", exact: true });
    expect((await board.boundingBox()).y).toBeGreaterThanOrEqual(
      (await titlebar.boundingBox()).height,
    );
    await titlebar
      .getByRole("button", { name: "Minimize", exact: true })
      .click();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].restore(),
    );
    await expect(board).toBeVisible();
    run.boardOpenMs = performance.now() - boardStart;
    await expect(board.locator("canvas")).toHaveCount(2);
    const bounds = await board.locator("canvas").first().boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width * 0.3,
      bounds.y + bounds.height * 0.4,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width * 0.6,
      bounds.y + bounds.height * 0.5,
      { steps: 20 },
    );
    await page.mouse.up();
    await expect.poll(() => canvasPixels(page)).toBeGreaterThan(0);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(900, 900),
    );
    await expect.poll(() => canvasPixels(page)).toBeGreaterThan(0);
    await capture(page, `board-900-${scale}`);
    await board
      .getByRole("button", { name: "Copy share link", exact: true })
      .click();
    const boardLink = await app.evaluate(({ clipboard }) =>
      clipboard.readText(),
    );
    expect(boardLink.startsWith("agent-academy://board/ascent?strat=")).toBe(
      true,
    );
    await page.keyboard.press("Control+z");
    await expect.poll(() => canvasPixels(page)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(board).toHaveCount(0);
    await app.evaluate(({ app }, link) => {
      app.emit("second-instance", {}, [app.getPath("exe"), link], "", {});
    }, boardLink);
    await expect(board).toBeVisible();
    await expect.poll(() => canvasPixels(page)).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(board).toHaveCount(0);
    run.checks.push(
      "draw, resize persistence, undo, Escape, native share clipboard and callback routing",
    );

    await page.locator('a[href="/ascent/sova"]:visible').click();
    await page.getByRole("heading", { name: "Sova", exact: true }).waitFor();
    const skeleton = page.getByLabel("Loading lineups");
    await expect(skeleton).toBeVisible();
    const skeletonBounds = await skeleton
      .locator(":scope > div")
      .first()
      .boundingBox();
    await capture(page, `lineups-loading-900-${scale}`);
    fixtures.release();
    await expect(page.locator("article:visible")).toHaveCount(48);
    const cardBounds = await page
      .locator("article:visible")
      .first()
      .boundingBox();
    expect(
      Math.abs(cardBounds.width - skeletonBounds.width),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(cardBounds.height - skeletonBounds.height),
    ).toBeLessThanOrEqual(1);
    await capture(page, `lineups-900-${scale}`);
    await page
      .getByRole("button", { name: "Load more setups", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(96);
    await page
      .getByRole("button", { name: "Load more setups", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(120);
    run.checks.push("matching skeleton geometry, pagination to 120 rows");
    await page.getByRole("tab", { name: "Defense", exact: true }).click();
    await expect(page.locator("article:visible")).toHaveCount(60);
    await page.getByRole("tab", { name: "All", exact: true }).click();
    await expect(page.locator("article:visible")).toHaveCount(120);
    await page.locator("article:visible button").first().click();
    await expect(
      page.getByRole("dialog", { name: "ATK Setup 1", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("f");
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("dialog", { name: "DEF Setup 2", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.keyboard.press("f");
    await expect(page.locator("article:visible")).toHaveCount(1);
    await page.keyboard.press("f");
    await expect(page.locator("article:visible")).toHaveCount(120);
    await page.keyboard.press("?");
    const shortcuts = page.getByRole("dialog", {
      name: "Keyboard shortcuts",
      exact: true,
    });
    await expect(shortcuts).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    expect(
      await shortcuts.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(shortcuts).toHaveCount(0);
    for (const size of [
      { width: 800, height: 640 },
      { width: 1440, height: 900 },
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0].setContentSize(
            size.width,
            size.height,
          ),
        size,
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await capture(page, `lineups-${size.width}-${scale}`);
    }
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(900, 900),
    );
    const siteFilter = page
      .getByRole("combobox", { name: "Site filter", exact: true })
      .filter({ visible: true });
    await siteFilter.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(
      page.getByRole("option", { name: "All sites", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("option", { name: "All sites", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("option", { name: "A Site", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(siteFilter).toContainText("A Site");
    await expect(page.locator("article:visible")).toHaveCount(60);
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(120);
    await page
      .getByRole("button", {
        name: "Filter by unspecified ability",
        exact: true,
      })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(120);
    run.checks.push(
      "typed side/site/ability filters, reset, lightbox, favorites, shortcuts and dialog focus",
    );
    await page
      .getByRole("button", { name: "Add Setup", exact: true })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill("QA setup");
    const editor = page.getByRole("dialog");
    await editor.getByRole("button", { name: /Shock Bolt/i }).click();
    await choose(page, "Setup side", "Attack");
    await editor
      .getByRole("combobox", { name: "Setup site", exact: true })
      .click();
    await expect(
      page.getByRole("option", { name: "C Site", exact: true }),
    ).toHaveCount(0);
    await capture(page, "site-menu-900-" + scale);
    await page.keyboard.press("Escape");
    await expect(editor).toBeVisible();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await choose(page, "Setup site", "A Site");
    await capture(page, "editor-900-" + scale);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(800, 640),
    );
    await editor.evaluate((node) => {
      node.scrollTop = 0;
    });
    await expect(
      editor.getByRole("heading", { name: "Add Sova Lineup", exact: true }),
    ).toBeInViewport();
    await capture(page, "editor-800-" + scale);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(900, 900),
    );
    const image = new PNG({ width: 2, height: 2 });
    image.data.fill(255);
    await page.locator("input[type=file]").setInputFiles({
      name: "qa.png",
      mimeType: "image/png",
      buffer: PNG.sync.write(image),
    });
    await page
      .getByRole("button", { name: "Add Setup", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "Sign in",
    );
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "QA setup",
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    run.checks.push("guest write denied with form values preserved");

    await page.goto(`${origin}/ascent/viper`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("article:visible")).toHaveCount(2);
    await page.getByRole("tab", { name: "Not specified", exact: true }).click();
    await choose(page, "Site filter", "Not specified");
    await page
      .getByRole("button", {
        name: "Filter by unspecified ability",
        exact: true,
      })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(2);
    await capture(page, `legacy-lineups-900-${scale}`);
    run.checks.push("legacy setups remain available in unclassified filters");

    await page.goto(`${origin}/ascent/chamber`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "No setups yet", exact: true }),
    ).toBeVisible();
    const emptyState = page.locator('[data-onboarding="lineup-card"]:visible');
    await expect(emptyState.locator("button, img")).toHaveCount(0);
    await expect(emptyState).not.toContainText(/smoke|flash|molly/i);
    await expect(
      page.getByRole("button", { name: /^Voice Line$/i }),
    ).toHaveCount(1);
    await expect(page.getByText(/Showing \d+ of \d+ setups/)).toHaveCount(0);
    await capture(page, `empty-lineups-${scale}`);
    run.checks.push(
      "neutral empty state, no duplicate portrait/voice/actions or redundant setup count",
    );

    await page.goto(`${origin}/feed`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("article:visible")).toHaveCount(48);
    fixtures.setEmptyFeed(true);
    const emptyFeedView = page.getByRole("region", {
      name: "Empty public feed",
      exact: true,
    });
    await expect(emptyFeedView).toBeVisible();
    expect((await emptyFeedView.boundingBox()).height).toBeGreaterThan(300);
    await expect(
      page.getByRole("link", { name: "Back", exact: true }),
    ).toHaveCount(0);
    await capture(page, `empty-public-feed-${scale}`);
    fixtures.setEmptyFeed(false);
    await expect(page.locator("article:visible")).toHaveCount(48);
    await page
      .getByRole("button", { name: "Load more setups", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(96);
    await capture(page, `feed-900-${scale}`);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const value = await window.agentAcademy.cache.read(
            "public-feed",
            false,
          );
          return value?.data?.length ?? 0;
        }),
      )
      .toBe(96);
    run.checks.push("Feed pagination and persistent public cache");
    console.log(`Checking account profile UI at scale ${scale}...`);
    await checkAccountProfile(page, capture, scale);
    run.checks.push(
      "profile UI with mocked SDK: photo/name display, validation, rejected update, save, remove photo, sign out",
    );
    await page.goto(`${origin}/feed`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("article:visible")).toHaveCount(48);
    await page
      .getByRole("button", { name: "Load more setups", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(96);
    await checkSettings(page, app, capture, scale);
    await expect(page.locator("article:visible")).toHaveCount(48);
    await page
      .getByRole("button", { name: "Load more setups", exact: true })
      .click();
    await expect(page.locator("article:visible")).toHaveCount(96);
    run.checks.push(
      "stable Back slot, custom map/agent confirmations, centered empty Feed, persisted Settings, video/music defaults and real GitHub update check",
    );
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].maximize(),
    );
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isMaximized(),
        ),
      )
      .toBe(true);
    await capture(page, `home-maximized-${scale}`);
    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.unmaximize();
      window.close();
    });
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isVisible(),
      ),
    ).toBe(false);
    expect(app.process().exitCode).toBe(null);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].showInactive(),
    );
    run.checks.push(
      "ambient settings, maximize, close to tray and window restore",
    );
    await expect(
      page.evaluate(() => window.agentAcademy.cache.read("anything", true)),
    ).rejects.toThrow();
    const isolated = await app.evaluate(({ BrowserWindow, safeStorage }) => {
      const preferences =
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      const encryption =
        safeStorage.isEncryptionAvailable() &&
        safeStorage.decryptString(safeStorage.encryptString("qa-probe")) ===
          "qa-probe";
      return {
        contextIsolation: preferences.contextIsolation,
        sandbox: preferences.sandbox,
        nodeIntegration: preferences.nodeIntegration,
        encryption,
      };
    });
    expect(isolated).toEqual({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      encryption: true,
    });
    expect(errors).toEqual([]);
    expect(nativeDialogs).toEqual([]);
    run.checks.push(
      "private cache locked for guests, OS encryption, renderer isolation, no page errors",
    );
    evidence.runs.push(run);
    savedProfile = profile;
  } finally {
    await quit(app);
  }
}
if (!process.argv.includes("--quick")) {
  for (const [name, profile] of [
    ["cold", await mkdtemp(path.join(output, "profile-offline-"))],
    ["saved", savedProfile],
  ]) {
    const env = { ...process.env, AGENT_ACADEMY_QA_HIDDEN: "1" };
    delete env.ELECTRON_RUN_AS_NODE;
    const app = await _electron.launch({
      executablePath,
      env,
      args: [`--user-data-dir=${profile}`, "--proxy-server=http://127.0.0.1:9"],
      timeout: 60000,
    });
    try {
      const page = await app.firstWindow();
      await page.waitForURL(`${origin}/`, {
        waitUntil: "load",
        timeout: 60000,
      });
      await app
        .context()
        .route(/^(https|wss):/, (route) => route.abort("internetdisconnected"));
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      const skip = page.getByRole("button", { name: "Skip tour", exact: true });
      if (await skip.isVisible()) await skip.click();
      if (name === "cold") {
        await expect(page.locator("a.map-select-card:visible")).toHaveCount(0);
        await page
          .getByRole("button", { name: "Add Map", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Add Ascent", exact: true })
          .click();
      }
      await expect(page.locator('a[href="/ascent"]:visible')).toBeVisible();
      expect(await page.locator(".skeleton:visible").count()).toBe(0);
      await page.locator('a[href="/ascent"]:visible').click();
      if (name === "cold") {
        await expect(page.locator('a[href^="/ascent/"]:visible')).toHaveCount(
          0,
        );
        await page
          .getByRole("button", { name: "Add agent", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Add Sova", exact: true })
          .click();
      }
      await expect(page.locator('a[href^="/ascent/"]:visible')).toHaveCount(
        name === "cold" ? 1 : 29,
      );
      await page.getByRole("button", { name: "Board", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Tactical board", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await page.goto(`${origin}/feed`, { waitUntil: "domcontentloaded" });
      if (name === "saved")
        await expect(page.locator("article:visible")).toHaveCount(96);
      else
        await expect(
          page.getByText("Connect to load public setups for the first time."),
        ).toBeVisible({ timeout: 30000 });
      evidence[name === "cold" ? "coldOfflineCatalog" : "savedOfflineFeed"] =
        true;
    } finally {
      await quit(app);
    }
  }
}
await writeFile(
  path.join(output, "results.json"),
  JSON.stringify(evidence, null, 2),
);
console.log(
  "Desktop visual and functional QA passed. OAuth/live-game verification is separate.",
);
