import { chromium, _electron, expect } from "@playwright/test";
import { readFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import nextEnv from "@next/env";
import { gunzipSync } from "node:zlib";
const electronMode = process.argv.includes("--electron");
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice(7);
const smoke = process.argv.includes("--smoke");
if (electronMode) nextEnv.loadEnvConfig(process.cwd(), true);
const output = electronMode ? "outputs/board-qa-electron" : "outputs/board-qa";
await mkdir(output, { recursive: true });
const data = JSON.parse(
  await readFile("lib/generated/board-data.json", "utf8"),
);
const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);
const origin = process.env.BOARD_QA_ORIGIN ?? "http://127.0.0.1:3000";
const browser = electronMode ? null : await chromium.launch({ headless: true });
const runningApps = new Set();
let diagnosticPage;
async function quit(app) {
  const child = app.process();
  if (child.exitCode !== null) return;
  const watchdog = setTimeout(() => child.kill(), 8000);
  try {
    await Promise.race([
      app.close().catch(() => undefined),
      new Promise((resolve) => child.once("exit", resolve)),
    ]);
  } finally {
    clearTimeout(watchdog);
    if (child.exitCode === null) child.kill();
  }
}
async function session(viewport, dpr = 1) {
  if (browser) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: dpr,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    return {
      page: await context.newPage(),
      close: () => context.close(),
      clipboard: (page) => page.evaluate(() => navigator.clipboard.readText()),
    };
  }
  const profile = await mkdtemp(path.resolve(output, "profile-"));
  const env = {
    ...process.env,
    AGENT_ACADEMY_QA_USER_DATA: profile,
    AGENT_ACADEMY_QA_HIDDEN: "1",
    AGENT_ACADEMY_DEV_URL: origin,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await _electron.launch({
    executablePath: createRequire(import.meta.url)("electron"),
    args: [path.resolve("desktop"), `--force-device-scale-factor=${dpr}`],
    env,
    timeout: 30000,
  });
  runningApps.add(app);
  console.log("Electron connected");
  const page = await app.firstWindow({ timeout: 20000 });
  page.setDefaultTimeout(15000);
  await app.evaluate(({ BrowserWindow }, viewport) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setContentSize(viewport.width, viewport.height);
    window.showInactive();
  }, viewport);
  return {
    page,
    close: async () => {
      await quit(app);
      runningApps.delete(app);
    },
    clipboard: () => app.evaluate(({ clipboard }) => clipboard.readText()),
  };
}
const report = {
  gameBuild: data.gameBuild,
  dataVersion: data.dataVersion,
  runtime: electronMode ? "Electron local development runtime" : "Chromium",
  scope: only
    ? `Targeted ${only}`
    : smoke
      ? "Three-ability smoke check"
      : "Full 116-ability / 13-map matrix",
  maps: [],
  abilities: [],
  errors: [],
};
async function open(page, mapId, document) {
  const payload = document
    ? `?strat=${encodeURIComponent(typeof document === "string" ? document : Buffer.from(JSON.stringify(document)).toString("base64"))}`
    : "";
  await page.goto(`${origin}/${mapId}${payload}`, {
    waitUntil: "domcontentloaded",
  });
  const board = page.locator("[data-tactical-board]");
  if (!document) {
    await page.getByRole("button", { name: "Board", exact: true }).click();
    // The development server can deliver the navigation shell before hydration.
    try {
      await board.waitFor({ timeout: 3000 });
    } catch {
      await page.getByRole("button", { name: "Board", exact: true }).click();
    }
  }
  await board.waitFor();
  // Next's development issue indicator overlaps the first agent at this viewport.
  // It is absent from production/Electron. Keep application UI untouched.
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important }",
  });
  return board;
}
async function select(page, slug) {
  const button = page.locator("[data-tactical-board]").getByRole("button", {
    name: catalog.agents[slug].displayName,
    exact: true,
  });
  if ((await button.getAttribute("aria-pressed")) !== "true")
    await button.click();
  await expect(page.locator("[data-board-ability]")).toHaveCount(4);
}
try {
  const active = await session({ width: 1600, height: 1000 });
  const page = active.page;
  diagnosticPage = page;
  page.on("console", (message) => {
    if (message.type() === "error") {
      if (message.text().includes("Next.js encountered URL data")) {
        report.routeShellDiagnostic =
          "Existing Next.js development instant-shell URL-data diagnostic";
        return;
      }
      console.log("renderer:", message.text().slice(0, 1800));
    }
  });
  page.on("pageerror", (error) => report.errors.push(error.message));
  await open(page, "ascent");
  for (const spec of only
    ? data.abilities.filter((spec) => `${spec.agentSlug}:${spec.slot}` === only)
    : smoke
      ? data.abilities.filter((spec) =>
          ["killjoy:Ability2", "viper:Ability2", "omen:Ultimate"].includes(
            `${spec.agentSlug}:${spec.slot}`,
          ),
        )
      : data.abilities) {
    await select(page, spec.agentSlug);
    await page.locator(`[data-board-ability="${spec.id}"]`).click();
    const bounds = await page.locator("[data-board-map]").boundingBox();
    const x = bounds.x + bounds.width * 0.5,
      y = bounds.y + bounds.height * 0.5;
    await page.mouse.move(x, y);
    await expect(page.locator("[data-board-token]")).toHaveCount(1);
    await page.mouse.down();
    if (spec.placement !== "point")
      await page.mouse.move(x + 50, y + 20, { steps: 3 });
    await page.mouse.up();
    await expect(page.locator("[data-board-map]")).toHaveAttribute(
      "data-board-phase",
      "idle",
    );
    const token = page.locator("[data-board-token]");
    await expect(token).toHaveCount(1);
    const before = await token.boundingBox();
    await page.mouse.move(
      before.x + before.width / 2 + 3,
      before.y + before.height / 2 + 2,
    );
    await page.mouse.down();
    await page.mouse.move(x + 23, y + 22, { steps: 3 });
    await page.mouse.up();
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+Shift+z");
    await token.click();
    for (const mode of spec.modes.slice(1)) {
      await page
        .locator("[data-board-object-controls]")
        .getByRole("button", { name: mode.label, exact: true })
        .click();
      if ((mode.targets ?? 1) > 1)
        for (let i = 1; i < mode.targets; i++) {
          await page
            .getByRole("button", { name: "Add target", exact: true })
            .click();
          await page.mouse.click(x + i * 15, y + i * 15);
        }
    }
    await page
      .getByRole("button", { name: "Copy share link", exact: true })
      .click();
    const link = await active.clipboard(page);
    expect(link).toContain("agent-academy://board/ascent?strat=");
    const payload = new URL(link).searchParams.get("strat");
    const bytes = gunzipSync(Buffer.from(payload, "base64"));
    const doc = JSON.parse(
      bytes.subarray(6, 6 + bytes.readUInt32LE(2)).toString("utf8"),
    );
    expect(doc.version).toBe(2);
    expect(
      doc.rows,
      `Committed ability missing before share: ${spec.agentSlug}:${spec.slot}`,
    ).toHaveLength(1);
    expect(doc.definitions[doc.rows[0][2]]).toBe(spec.id);
    await open(page, "ascent", payload);
    await expect(page.locator("[data-board-token]")).toHaveCount(1);
    await page.locator("[data-board-token]").click();
    await page
      .getByRole("button", { name: "Delete selected object", exact: true })
      .click();
    await expect(token).toHaveCount(0);
    report.abilities.push({
      id: spec.id,
      name: spec.name,
      modes: spec.modes.map((mode) => mode.id),
      interactions: "passed",
      gameplayGeometry: spec.modes.some(
        (mode) => mode.geometry.kind === "ground-volume",
      )
        ? "unresolved"
        : "not certified by this UI test",
    });
    console.log(
      `${report.abilities.length}/116 ${spec.agentSlug}: ${spec.name}`,
    );
  }
  await page.screenshot({ path: `${output}/board-ascent.png` });
  await active.close();
  for (const dpr of [1, 2]) {
    const active = await session(
      { width: dpr === 1 ? 1440 : 900, height: 900 },
      dpr,
    );
    const page = active.page;
    for (const map of process.argv.includes("--smoke")
      ? data.maps.filter((map) => map.mapId === "ascent")
      : data.maps) {
      await open(page, map.mapId);
      const bounds = await page.locator("[data-board-map]").boundingBox();
      expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
      await page.getByRole("button", { name: "Pen", exact: true }).click();
      await page.mouse.move(bounds.x + 100, bounds.y + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 160, bounds.y + 140);
      await page.mouse.up();
      expect(
        await page.locator("[data-board-ink]").evaluate((canvas) =>
          canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height)
            .data.some((value, i) => i % 4 === 3 && value > 0),
        ),
      ).toBe(true);
      await page.screenshot({ path: `${output}/${map.mapId}-dpr${dpr}.png` });
      report.maps.push({
        map: map.mapId,
        dpr,
        width: bounds.width,
        drawing: "passed",
      });
    }
    await active.close();
  }
} catch (error) {
  report.failure = String(error.stack ?? error);
  console.error(report.failure);
  if (diagnosticPage && !diagnosticPage.isClosed())
    await diagnosticPage
      .screenshot({ path: `${output}/failure.png` })
      .catch(() => undefined);
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  for (const app of runningApps) await quit(app);
}
