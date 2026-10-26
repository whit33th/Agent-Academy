import { _electron, chromium, expect } from "@playwright/test";
import { mkdir, mkdtemp, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import nextEnv from "@next/env";
import { PNG } from "pngjs";
import {
  crosshairGeometry,
  parseValorantCrosshair,
} from "../lib/aim/crosshair.ts";

const require = createRequire(import.meta.url);
const fixtureCrosshair = parseValorantCrosshair(
  `EAresStringSettingName::SavedCrosshairProfileData=${JSON.stringify(JSON.stringify(JSON.parse(await readFile(new URL("../tests/fixtures/valorant-crosshair.json", import.meta.url), "utf8"))))}`,
);
const packaged = process.argv.includes("--packaged");
const web = process.argv.includes("--web");
const output = path.resolve(
  "outputs/aim-qa",
  packaged ? "packaged" : web ? "web" : "electron",
);
await mkdir(output, { recursive: true });
const origin =
  process.argv.find((arg) => arg.startsWith("--origin="))?.slice(9) ??
  (packaged ? "http://127.0.0.1:37491" : "http://127.0.0.1:3000");
const report = {
  runtime: packaged
    ? "packaged Electron"
    : web
      ? "Chromium visual fixtures"
      : "development Electron",
  fixtureSettings: web,
  screenshots: [],
  checks: [],
  errors: [],
};
let app, browser, page;
async function shot(page, name) {
  console.log(`Capture ${name}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    animations: "disabled",
    timeout: 30000,
  });
  report.screenshots.push(name);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await page.locator(".aim-range:visible").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom <= innerHeight + 1;
    }),
  ).toBe(true);
}
function installProbe() {
  window.__aimQA = {
    draws: 0,
    drawFrames: 0,
    tick: 0,
    lastDrawTick: -1,
    events: [],
    requests: [],
    moves: 0,
    countsX: 0,
    countsY: 0,
    distance: 0,
  };
  const probe = window.__aimQA;
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) =>
    raf.call(window, (now) => {
      probe.tick = now;
      callback(now);
    });
  const observe = () =>
    new MutationObserver((records) => {
      for (const record of records)
        if (
          record.target.classList?.contains("aim-target") ||
          record.target.classList?.contains("aim-target-feedback")
        ) {
          probe.draws++;
          if (probe.lastDrawTick !== probe.tick) {
            probe.drawFrames++;
            probe.lastDrawTick = probe.tick;
          }
        }
    }).observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  if (document.documentElement) observe();
  else document.addEventListener("DOMContentLoaded", observe, { once: true });
  window.addEventListener(
    "mousemove",
    (event) => {
      if (document.pointerLockElement) {
        probe.moves++;
        probe.countsX += event.movementX;
        probe.countsY += event.movementY;
        probe.distance += Math.hypot(event.movementX, event.movementY);
      }
    },
    true,
  );
  const request = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function (options) {
    probe.requests.push(options);
    return request.call(this, options);
  };
  for (const event of [
    "pointerlockchange",
    "pointerlockerror",
    "visibilitychange",
  ])
    document.addEventListener(event, () =>
      probe.events.push({
        event,
        locked: !!document.pointerLockElement,
        hidden: document.hidden,
        time: performance.now(),
      }),
    );
  for (const event of ["blur", "focus"])
    window.addEventListener(event, () =>
      probe.events.push({ event, time: performance.now() }),
    );
}
try {
  if (web) {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    await context.addInitScript((crosshair) => {
      const noop = () => {};
      const subscribe = () => noop;
      window.agentAcademy = {
        version: 1,
        getSnapshot: async () => ({
          revision: 0,
          source: "windows-log",
          gameRunning: false,
          phase: "menu",
          mapSlug: null,
          agentSlug: null,
          mode: null,
          agentLocked: false,
          sessionId: null,
          observedAt: null,
          sourceStatus: "ready",
          reason: null,
        }),
        subscribe,
        aim: {
          settings: async () => ({
            status: "ready",
            sensitivity: 0.485000014,
            profileKey: "visual-fixture",
            modifiedAt: "2026-10-22T00:00:00Z",
            crosshair,
          }),
          onSuspend: subscribe,
        },
        window: {
          isMaximized: async () => false,
          onState: subscribe,
          close: noop,
          minimize: noop,
          toggleMaximize: noop,
        },
        preferences: {
          get: async () => ({ autoStart: false, closeToTray: true }),
          onOpen: subscribe,
        },
        updates: {
          get: async () => ({
            status: "idle",
            currentVersion: "test",
            availableVersion: null,
            percent: 0,
            message: null,
          }),
          subscribe,
        },
        cache: {
          authorize: async () => false,
          read: async () => null,
          write: async () => {},
          image: async () => null,
        },
      };
    }, fixtureCrosshair);
    await context.addInitScript(installProbe);
    page = await context.newPage();
  } else {
    nextEnv.loadEnvConfig(process.cwd(), true);
    const profile = await mkdtemp(path.join(os.tmpdir(), "aim-qa-"));
    const env = { ...process.env, AGENT_ACADEMY_QA_USER_DATA: profile };
    if (!packaged) env.AGENT_ACADEMY_DEV_URL = origin;
    delete env.ELECTRON_RUN_AS_NODE;
    const executablePath = packaged
      ? path.resolve(
          process.argv
            .find((arg) => arg.startsWith("--executable="))
            ?.slice(13) ?? "release/win-unpacked/Agent Academy.exe",
        )
      : require("electron");
    const args = packaged
      ? [`--user-data-dir=${profile}`]
      : [path.resolve("desktop")];
    app = await _electron.launch({ executablePath, args, env, timeout: 30000 });
    page = await app.firstWindow();
    await page.waitForURL(`${origin}/**`, { timeout: 30000 });
    await page.addInitScript(installProbe);
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.show();
      win.focus();
      win.webContents.focus();
    });
  }
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  await page.goto(`${origin}/aim`, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Start training", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  const range = page.locator(".aim-range:visible");
  const stage = page.getByRole("application", { name: "Aim training field" });
  const start = () =>
    page.getByRole("button", { name: "Start training", exact: true }).click();
  const phase = (name) =>
    expect(page.locator(`.aim-range[data-phase="${name}"]`)).toBeVisible();
  const focus = async () => {
    if (app)
      await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows().find((w) =>
          w.webContents.getURL().includes("/aim"),
        );
        win.show();
        win.focus();
        win.webContents.focus();
      });
  };
  const cooldown = () =>
    expect(
      page.getByRole("button", { name: "Start training", exact: true }),
    ).toBeEnabled();
  const color = range.getByLabel("Background color", { exact: true });
  await expect(color).toHaveValue("#737373");
  await expect(stage).toHaveCSS("background-color", "rgb(115, 115, 115)");
  await expect(range.locator(".aim-viewport")).toHaveCSS(
    "background-color",
    "rgb(115, 115, 115)",
  );
  await range.getByLabel("Target size", { exact: true }).fill("3.5");
  const targetBeforeColor = await page
    .locator(".aim-target")
    .evaluateAll((images) =>
      images.map((image) => ({ src: image.src, style: image.style.cssText })),
    );
  await color.fill("#52616b");
  await expect(stage).toHaveCSS("background-color", "rgb(82, 97, 107)");
  await expect(range.locator(".aim-viewport")).toHaveCSS(
    "background-color",
    "rgb(82, 97, 107)",
  );
  await expect(range.getByLabel("Target size", { exact: true })).toHaveValue(
    "3.5",
  );
  expect(
    await page
      .locator(".aim-target")
      .evaluateAll((images) =>
        images.map((image) => ({ src: image.src, style: image.style.cssText })),
      ),
  ).toEqual(targetBeforeColor);
  await shot(page, "custom-background");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Start training", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await expect(color).toHaveValue("#52616b");
  await expect(stage).toHaveCSS("background-color", "rgb(82, 97, 107)");
  await color.fill("#737373");
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  report.checks.push(
    "neutral gray default; custom color covers field and letterbox, persists after reload and does not respawn targets or reset exercise settings",
  );
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  expect(
    await range.locator("h1, h2, p, .aim-hitmarker, .aim-hero").count(),
  ).toBe(0);
  expect(await range.innerText()).not.toMatch(
    /VALORANT|sensitivity|locked|range|accuracy/i,
  );
  expect(
    await range.evaluate((element) =>
      [
        element.textContent,
        ...[element, ...element.querySelectorAll("*")].flatMap((node) => [
          node.getAttribute("aria-label"),
          node.getAttribute("title"),
          node.getAttribute("placeholder"),
        ]),
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ).not.toMatch(/[\u0400-\u04ff]/);
  report.checks.push("Aim UI, tooltips and accessible labels are English");
  expect(await range.locator('input[type="number"]').count()).toBe(0);
  expect(await range.locator("select").count()).toBe(0);
  for (const name of [
    "Easy",
    "Medium",
    "Hard",
    "No timer",
    "30 seconds",
    "60 seconds",
  ])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  expect(await range.innerText()).not.toContain("°");
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  await expect(range.getByLabel("Target size", { exact: true })).toHaveValue(
    "3",
  );
  await expect(range.getByLabel("Target speed", { exact: true })).toHaveValue(
    "0",
  );
  await expect(
    page.getByRole("button", { name: "Easy", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await shot(page, "toolbar-easy");
  await page
    .locator(".aim-toolbar")
    .screenshot({ path: path.join(output, "toolbar-detail.png") });
  report.screenshots.push("toolbar-detail");
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  await range.getByLabel("Target size", { exact: true }).fill("4");
  expect(
    await page
      .getByRole("group", { name: "Difficulty", exact: true })
      .locator('[aria-pressed="true"]')
      .count(),
  ).toBe(0);
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  report.checks.push(
    "square difficulty and duration controls; presets and manual values stay consistent; no degrees",
  );
  report.checks.push(
    "direct field, app header visible; no hero, descriptions, sensitivity display, appearance selector or hitmarker",
  );
  report.importedSettings = await page.evaluate(() =>
    window.agentAcademy.aim.settings(),
  );
  expect(report.importedSettings.status).toBe("ready");
  async function checkCrosshair(cdp = null) {
    const imported = report.importedSettings.crosshair;
    const raster = await page
      .locator("canvas.aim-crosshair")
      .evaluate((canvas) => {
        const r = canvas.getBoundingClientRect();
        const stage = [...document.querySelectorAll(".aim-stage")]
          .find((element) => element.getBoundingClientRect().width > 0)
          .getBoundingClientRect();
        return {
          width: canvas.width,
          height: canvas.height,
          cssWidth: r.width,
          left: r.left,
          dpr: devicePixelRatio,
          scaleHeight: stage.height * devicePixelRatio,
          pixels: Array.from(
            canvas
              .getContext("2d")
              .getImageData(0, 0, canvas.width, canvas.height).data,
          ),
        };
      });
    expect(raster.cssWidth * raster.dpr).toBeCloseTo(raster.width, 3);
    expect(raster.left * raster.dpr).toBeCloseTo(
      Math.round(raster.left * raster.dpr),
      3,
    );
    const scale = imported.scaleToResolution ? raster.scaleHeight / 1080 : 1;
    const geometry = crosshairGeometry(imported, scale);
    // Current local profile has no outline/dot or overlapping layers. Validate
    // the actual canvas pixels against imported RGB, opacity and line geometry.
    if (!imported.outline.visible && geometry.length === 1) {
      const expected = new Map();
      const color = imported.color
        .slice(1)
        .match(/../g)
        .map((byte) => parseInt(byte, 16));
      for (const { x, y, width, height } of geometry[0].rects)
        for (let dy = 0; dy < height; dy++)
          for (let dx = 0; dx < width; dx++)
            expected.set(
              `${raster.width / 2 + x + dx},${raster.height / 2 + y + dy}`,
              [...color, Math.round(255 * geometry[0].opacity)],
            );
      for (let y = 0; y < raster.height; y++)
        for (let x = 0; x < raster.width; x++) {
          const offset = (y * raster.width + x) * 4;
          const value = expected.get(`${x},${y}`) ?? [0, 0, 0, 0];
          for (let channel = 0; channel < 4; channel++)
            expect(
              Math.abs(raster.pixels[offset + channel] - value[channel]),
            ).toBeLessThanOrEqual(1);
        }
      if (cdp) {
        const clip = await page
          .locator("canvas.aim-crosshair")
          .evaluate((canvas) => {
            const r = canvas.getBoundingClientRect();
            return {
              x: Math.round(r.left * devicePixelRatio) / devicePixelRatio,
              y: Math.round(r.top * devicePixelRatio) / devicePixelRatio,
              width: canvas.width / devicePixelRatio,
              height: canvas.height / devicePixelRatio,
              scale: 1,
            };
          });
        const { data } = await cdp.send("Page.captureScreenshot", {
          format: "png",
          clip,
        });
        const buffer = Buffer.from(data, "base64");
        await writeFile(
          path.join(output, `crosshair-${raster.dpr}.png`),
          buffer,
        );
        const frame = PNG.sync.read(buffer);
        expect(frame.width).toBe(raster.width);
        expect(frame.height).toBe(raster.height);
        const background = Array.from(frame.data.subarray(0, 3));
        for (let y = 0; y < frame.height; y++)
          for (let x = 0; x < frame.width; x++) {
            const value = expected.get(`${x},${y}`) ?? [0, 0, 0, 0];
            const alpha = value[3] / 255;
            for (let channel = 0; channel < 3; channel++) {
              const composite =
                value[channel] * alpha + background[channel] * (1 - alpha);
              expect(
                Math.abs(
                  frame.data[(y * frame.width + x) * 4 + channel] - composite,
                ),
              ).toBeLessThanOrEqual(2);
            }
          }
      }
    }
    return {
      outputPixels: raster.width,
      cssPixels: raster.cssWidth,
      dpr: raster.dpr,
    };
  }
  report.crosshair = await checkCrosshair();
  report.checks.push(
    "selected VALORANT crosshair: imported RGB, alpha, geometry and physical-pixel DPI sizing",
  );
  report.renderer =
    "native-resolution HD image layers; no full-field canvas or WebGL";
  if (app)
    report.gpu = await app.evaluate(({ app }) => app.getGPUFeatureStatus());
  const visibleTargets = () =>
    page.locator(".aim-target").evaluateAll((images) =>
      images
        .filter((image) => getComputedStyle(image).display !== "none")
        .map((image) => ({
          src: image.src,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
    );
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".aim-target")]
      .filter((img) => getComputedStyle(img).display !== "none")
      .every((img) => img.complete && img.naturalWidth === 1024),
  );
  expect((await visibleTargets()).length).toBe(1);
  for (const [width, height] of [
    [1280, 720],
    [1920, 1080],
    [3840, 2160],
  ]) {
    if (app)
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()
            .find((w) => w.webContents.getURL().includes("/aim"))
            .setContentSize(size.width, size.height),
        { width, height },
      );
    else await page.setViewportSize({ width, height });
    await page.waitForTimeout(180);
    await shot(page, `field-${width}`);
    const geometry = await stage.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    expect(geometry.width / geometry.height).toBeCloseTo(16 / 9, 2);
    await checkCrosshair();
    report.checks.push(`field and toolbar fit ${width}x${height}`);
  }
  if (app)
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("/aim"))
        .setContentSize(1280, 720),
    );
  else await page.setViewportSize({ width: 1280, height: 720 });
  if (web) {
    const hideTargets = await page.addStyleTag({
      content:
        ".aim-target, .aim-target-feedback { visibility: hidden !important; }",
    });
    const cdp = await page.context().newCDPSession(page);
    report.crosshairDpi = [];
    for (const deviceScaleFactor of [1.25, 1.5, 2]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: 1280 + Math.round(deviceScaleFactor * 10),
        height: 720,
        deviceScaleFactor,
        mobile: false,
      });
      await page.waitForFunction((dpr) => {
        const canvas = document.querySelector("canvas.aim-crosshair");
        return (
          devicePixelRatio === dpr &&
          Math.abs(canvas.getBoundingClientRect().width * dpr - canvas.width) <
            0.001
        );
      }, deviceScaleFactor);
      report.crosshairDpi.push(await checkCrosshair(cdp));
    }
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    await cdp.detach();
    await page.waitForFunction(() => devicePixelRatio === 1);
    await hideTargets.evaluate((style) => style.remove());
    report.checks.push(
      "crosshair stays sharp and the same physical size at 125%, 150% and 200% DPI",
    );
  }
  await page.getByRole("button", { name: "Moving", exact: true }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".aim-target")].every(
      (img) => img.complete && img.naturalWidth === 1024,
    ),
  );
  const targets = await visibleTargets();
  expect(targets).toHaveLength(3);
  expect(new Set(targets.map((target) => target.src)).size).toBe(3);
  await shot(page, "moving");
  report.targetSources = targets;
  await range.getByLabel("Target size", { exact: true }).fill("6");
  await shot(page, "hd-targets");
  await range.getByLabel("Target size", { exact: true }).fill("2");
  report.checks.push("three different HD targets; flick mode shows one target");
  if (!web) {
    report.displays = await app.evaluate(({ screen }) =>
      screen.getAllDisplays().map((display) => ({
        id: display.id,
        bounds: display.bounds,
        scaleFactor: display.scaleFactor,
        primary: display.id === screen.getPrimaryDisplay().id,
      })),
    );
    const secondary = report.displays.find((display) => !display.primary);
    if (secondary) {
      await app.evaluate(
        ({ BrowserWindow }, display) =>
          BrowserWindow.getAllWindows()
            .find((w) => w.webContents.getURL().includes("/aim"))
            .setBounds({
              x: display.bounds.x + 20,
              y: display.bounds.y + 20,
              width: Math.min(1280, display.bounds.width - 40),
              height: Math.min(800, display.bounds.height - 40),
            }),
        secondary,
      );
      await shot(page, "second-display");
      report.crosshairSecondDisplay = await checkCrosshair();
      report.checks.push("window can be moved to second display");
    }
    await focus();
    const bounds = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("/aim"))
        .getBounds(),
    );
    await stage.click();
    await phase("running");
    expect(await page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("/aim"))
          .isFullScreen(),
      ),
    ).toBe(false);
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("/aim"))
          .getBounds(),
      ),
    ).toEqual(bounds);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    report.checks.push(
      "field click acquires real raw lock, keeps window bounds and header",
    );
    await shot(page, "running");
    report.frames = await page.evaluate(async () => {
      const samples = [];
      let last = performance.now();
      const before = window.__aimQA.drawFrames,
        began = last;
      await new Promise((resolve) => {
        const frame = (now) => {
          samples.push(now - last);
          last = now;
          if (samples.length < 120) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      const clean = samples.slice(5),
        sorted = clean.toSorted((a, b) => a - b);
      return {
        medianMs: sorted[Math.floor(sorted.length * 0.5)],
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        callbackFps: 1000 / (clean.reduce((a, b) => a + b, 0) / clean.length),
        targetUpdateFps:
          ((window.__aimQA.drawFrames - before) * 1000) /
          (performance.now() - began),
      };
    });
    report.activeMetrics = await app.evaluate(({ app }) =>
      app
        .getAppMetrics()
        .map((m) => ({ type: m.type, cpu: m.cpu, memory: m.memory })),
    );
    for (let i = 0; i < 25; i++)
      await page.mouse.move(i % 2 ? 1900 : 20, i % 2 ? 1000 : 20);
    expect(await page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    const movementBefore = await page.evaluate(() => ({
      moves: window.__aimQA.moves,
      x: window.__aimQA.countsX,
      distance: window.__aimQA.distance,
    }));
    for (let index = 0; index < 30; index++)
      await page.mouse.move(1000 + index * 1000, 400);
    const movementAfter = await page.evaluate(() => ({
      moves: window.__aimQA.moves,
      x: window.__aimQA.countsX,
      distance: window.__aimQA.distance,
    }));
    expect(movementAfter.moves - movementBefore.moves).toBeGreaterThanOrEqual(
      29,
    );
    expect(movementAfter.distance - movementBefore.distance).toBeGreaterThan(
      10000,
    );
    await page.evaluate(() =>
      window.dispatchEvent(
        new MouseEvent("mousemove", {
          movementX: -window.__aimQA.countsX,
          movementY: -window.__aimQA.countsY,
        }),
      ),
    );
    await expect.poll(async () => (await visibleTargets()).length).toBe(3);
    report.checks.push(
      "long one-direction input remains nonzero beyond window bounds; inverse input returns every target to view",
    );
    await page.mouse.click(1270, 8);
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some(
          (w) =>
            w.webContents.getURL().includes("/aim") &&
            w.isVisible() &&
            !w.isDestroyed(),
        ),
      ),
    ).toBe(true);
    report.checks.push(
      "raw lock survives 25 large movements and click near window close control",
    );
    await page.keyboard.press("Escape");
    await phase("paused");
    expect(await page.evaluate(() => !!document.pointerLockElement)).toBe(
      false,
    );
    await shot(page, "paused");
    await page.waitForTimeout(200);
    const writes = await page.evaluate(() => window.__aimQA.draws);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__aimQA.draws)).toBe(writes);
    report.pausedMetrics = await app.evaluate(({ app }) =>
      app
        .getAppMetrics()
        .map((m) => ({ type: m.type, cpu: m.cpu, memory: m.memory })),
    );
    report.checks.push("pause produces zero target layer mutations");
    await cooldown();
    await start();
    await phase("running");
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("/aim"))
        .minimize(),
    );
    await expect(
      page.locator('.aim-range[data-phase="paused"]'),
    ).toBeAttached();
    await page.waitForTimeout(200);
    const hidden = await page.evaluate(() => window.__aimQA.draws);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__aimQA.draws)).toBe(hidden);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("/aim"))
        .restore(),
    );
    await focus();
    expect(await page.evaluate(() => !!document.pointerLockElement)).toBe(
      false,
    );
    report.checks.push(
      "minimize freezes targets; focus never reacquires automatically",
    );
  }
  await page.getByRole("button", { name: "Tracking", exact: true }).click();
  await range.getByLabel("Target speed", { exact: true }).fill("0");
  if (!web) {
    await cooldown();
    await focus();
    await start();
    await phase("running");
    // Inject known relative counts at the real controller boundary after acquiring real raw lock.
    // Screen-to-angle calculation is independent of controller/session internals.
    await page.evaluate((sensitivity) => {
      const image = [...document.querySelectorAll(".aim-target")].find(
        (img) => getComputedStyle(img).display !== "none",
      );
      const centers = {
        "rift-v1-hd.webp": [0.49641, 0.48923],
        "rift-v2-hd.webp": [0.49841, 0.47329],
        "rift-v3-hd.webp": [0.5008, 0.5012],
        "rift-v4-hd.webp": [0.48046, 0.50957],
      };
      const center = centers[image.src.split("/").at(-1)],
        m = new DOMMatrix(getComputedStyle(image).transform),
        stage = image.parentElement;
      const x =
          m.a * center[0] * image.width + m.c * center[1] * image.height + m.e,
        y =
          m.b * center[0] * image.width + m.d * center[1] * image.height + m.f;
      const focal = stage.clientWidth / (2 * Math.tan((103 * Math.PI) / 360));
      const sx = (x - stage.clientWidth / 2) / focal,
        sy = (stage.clientHeight / 2 - y) / focal;
      const yaw = (Math.atan(sx) * 180) / Math.PI,
        pitch = (Math.atan(sy / Math.sqrt(1 + sx * sx)) * 180) / Math.PI;
      window.dispatchEvent(
        new MouseEvent("mousemove", {
          movementX: Math.round(yaw / (sensitivity * 0.07)),
          movementY: Math.round(-pitch / (sensitivity * 0.07)),
        }),
      );
    }, report.importedSettings.sensitivity);
    await expect(page.locator(".aim-target.is-tracked")).toBeVisible();
    await expect(
      page.locator(".aim-target-feedback").filter({ visible: true }),
    ).toHaveCount(1);
    await page.mouse.down();
    await shot(page, "tracking-feedback");
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await phase("paused");
    expect(await page.locator(".aim-target.is-tracked").count()).toBe(0);
    report.checks.push(
      "tracking lights the aimed target without extra text and clears feedback on interruption",
    );
    await page.getByRole("button", { name: "30 seconds", exact: true }).click();
    await cooldown();
    await focus();
    await start();
    await phase("running");
    await expect(page.locator('.aim-range[data-phase="results"]')).toBeVisible({
      timeout: 42000,
    });
    expect(await page.evaluate(() => !!document.pointerLockElement)).toBe(
      false,
    );
    await shot(page, "finished");
    report.checks.push(
      "30 active seconds stop training, clear feedback and release mouse without an overlay",
    );
    report.input = await page.evaluate(() => window.__aimQA);
    expect(report.input.requests.length).toBeGreaterThanOrEqual(web ? 2 : 4);
    expect(
      report.input.requests.every(
        (request) => request?.unadjustedMovement === true,
      ),
    ).toBe(true);
  } else {
    await shot(page, "tracking-field");
  }
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(range).toBeHidden({ timeout: 30000 });
  expect(await page.locator(".aim-target").count()).toBe(0);
  await expect(page.locator("canvas.aim-crosshair")).toHaveCount(0);
  report.checks.push("header navigation disposes target and crosshair layers");
  expect(report.errors).toEqual([]);
} catch (error) {
  report.failure = error.stack ?? String(error);
  process.exitCode = 1;
  if (page && !page.isClosed())
    report.failureState = await page
      .evaluate(() => ({
        phase: document.querySelector(".aim-range")?.getAttribute("data-phase"),
        text: document.body.innerText,
        issue: document.querySelector(".aim-issue")?.getAttribute("title"),
        probe: window.__aimQA,
      }))
      .catch(() => null);
} finally {
  if (browser) await browser.close();
  if (app) await app.close().catch(() => {});
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      runtime: report.runtime,
      checks: report.checks,
      frames: report.frames,
      errors: report.errors,
      failure: report.failure,
    }),
  );
}
