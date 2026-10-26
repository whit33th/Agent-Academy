import { chromium, _electron, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import nextEnv from "@next/env";

const require = createRequire(import.meta.url);
const origin = process.env.QA_ORIGIN ?? "http://127.0.0.1:3000";
const out = path.resolve(
  process.env.QA_OUTPUT_DIR ?? "outputs/lineup-video-qa",
);
await mkdir(out, { recursive: true });
const reviewed = JSON.parse(
  await readFile(
    process.env.QA_TRACKER_MANIFEST ??
      "data/lineup-import/public-lineups-tracker-player-repair-2026-10-26.json",
    "utf8",
  ),
).records;
const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);
const report = {
  at: new Date().toISOString(),
  inventory: [
    "Live Tracker clip opens and advances with audio muted",
    "All repaired Tracker entries resolve an actual player",
    "Pause/resume and sound controls",
    "Next lineup resets the player and audio default",
    "Close and reopen",
    "Electron fullscreen and Escape",
    "Narrow window/player fit",
    "Offline and reconnect",
    "Unsupported external guide has a visible original link",
    "Header uses the same map splash image as the home map selector",
  ],
  checks: [],
  playback: [],
  errors: [],
  boundaries: [
    "Live development feed as guest; no authenticated writes or gameplay tests.",
    "Installed-client update is not exercised.",
    "Isolated Electron QA profile; active-game navigation marker staged so game detection does not move the QA route.",
  ],
};
let browser, app;

async function closeDetail(page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.count())
    await dialog
      .getByRole("button", { name: "Close lineup details", exact: true })
      .click();
}
async function openClip(page, title) {
  await closeDetail(page);
  const card = page.getByRole("button", { name: `View ${title}`, exact: true });
  for (let i = 0; !(await card.count()) && i < 10; i++) {
    const more = page.getByRole("button", {
      name: "Load more setups",
      exact: true,
    });
    await expect(more).toBeVisible();
    await more.click();
    await expect.poll(() => card.count()).toBeGreaterThan(0);
  }
  await card.click();
  const dialog = page.getByRole("dialog");
  const iframe = dialog.locator("iframe");
  await expect(iframe).toBeVisible();
  const frame = dialog.frameLocator("iframe");
  const video = frame.locator("video");
  await expect
    .poll(() => video.evaluate((v) => v.currentTime), { timeout: 20000 })
    .toBeGreaterThan(0.1);
  const initial = await video.evaluate((v) => ({
    time: v.currentTime,
    muted: v.muted,
    paused: v.paused,
    duration: v.duration,
    width: v.videoWidth,
    height: v.videoHeight,
  }));
  expect(initial.muted).toBe(true);
  expect(initial.paused).toBe(false);
  expect(initial.width).toBeGreaterThan(0);
  await expect
    .poll(() => video.evaluate((v) => v.currentTime), { timeout: 10000 })
    .toBeGreaterThan(initial.time + 0.1);
  return { dialog, iframe, frame, video, initial };
}
async function controls(player) {
  await player.iframe.hover();
  await player.frame
    .getByRole("button", { name: "Pause", exact: true })
    .click();
  await expect.poll(() => player.video.evaluate((v) => v.paused)).toBe(true);
  await player.frame.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => player.video.evaluate((v) => v.paused)).toBe(false);
  await player.frame.getByRole("button", { name: /Click to unmute/ }).click();
  await expect.poll(() => player.video.evaluate((v) => v.muted)).toBe(false);
  await player.frame.getByRole("button", { name: /Click to mute/ }).click();
  await expect.poll(() => player.video.evaluate((v) => v.muted)).toBe(true);
}
async function externalGuide(page) {
  await closeDetail(page);
  for (const [label, option] of [
    ["Map filter", "Bind"],
    ["Agent filter", "Neon"],
  ]) {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }
  await expect(page.locator("article").first()).toContainText("External guide");
  await page.locator('article button[aria-label^="View "]').first().click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Open original guide", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator("iframe")).toHaveCount(0);
}

async function youtubeGuide(page, runtime) {
  await closeDetail(page);
  for (const [label, option] of [
    ["Map filter", "Summit"],
    ["Agent filter", "Vyse"],
  ]) {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }
  await page.locator("article").first().waitFor();
  const player = await openClip(
    page,
    "B Main choke isolation with Shear and Razorvine",
  );
  expect(await player.iframe.getAttribute("src")).toContain(
    "youtube-nocookie.com",
  );
  expect(player.initial.time).toBeGreaterThanOrEqual(216);
  report.playback.push({ runtime: runtime + "-YouTube", ...player.initial });
  report.checks.push(
    runtime + ": YouTube chapter plays automatically with sound muted",
  );
}
async function fit(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const box = await page.getByRole("dialog").locator("iframe").boundingBox();
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
  }));
  expect(box.width).toBeGreaterThan(250);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y).toBeGreaterThan(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

try {
  browser = await chromium.launch({
    executablePath:
      process.env.QA_CHROME_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(origin + "/feed", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.locator("article").first().waitFor({ timeout: 60000 });
  let player = await openClip(page, reviewed[0].title);
  await expect(player.dialog.locator("header img").first()).toHaveAttribute(
    "src",
    catalog.maps[reviewed[0].mapSlug].splash,
  );
  await controls(player);
  await fit(page);
  await page.screenshot({
    path: path.join(out, "chrome-wide.png"),
    scale: "css",
  });
  report.checks.push(
    "Chrome: Tracker autoplay, mute, pause/resume and sound controls",
  );
  for (const record of reviewed) {
    player = await openClip(page, record.title);
    report.playback.push({
      runtime: "Chrome",
      title: record.title,
      src: await player.iframe.getAttribute("src"),
      ...player.initial,
    });
    console.log("Chrome playback OK: " + record.title);
  }
  player = await openClip(page, reviewed[0].title);
  await player.dialog
    .getByRole("button", { name: "Next lineup", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .frameLocator("iframe")
        .locator("video")
        .evaluate((v) => v.muted),
    )
    .toBe(true);
  report.checks.push("Chrome: next lineup initializes a muted player");
  await page.setViewportSize({ width: 390, height: 844 });
  player = await openClip(page, reviewed[0].title);
  await fit(page);
  await page.screenshot({
    path: path.join(out, "chrome-narrow.png"),
    scale: "css",
  });
  await context.setOffline(true);
  await expect(page.getByRole("dialog")).toContainText(
    "Connect to the internet",
  );
  await expect(page.getByRole("dialog").locator("iframe")).toHaveCount(0);
  await context.setOffline(false);
  await expect
    .poll(
      () =>
        page
          .getByRole("dialog")
          .frameLocator("iframe")
          .locator("video")
          .evaluate((v) => v.currentTime),
      { timeout: 20000 },
    )
    .toBeGreaterThan(0.1);
  report.checks.push(
    "Chrome: 390px layout, offline message and playback after reconnect",
  );
  await externalGuide(page);
  await page.screenshot({
    path: path.join(out, "external-guide.png"),
    scale: "css",
  });
  report.checks.push(
    "External guides have a visible original link and are not labelled as playable video",
  );
  await youtubeGuide(page, "Chrome");
  await browser.close();
  browser = null;

  nextEnv.loadEnvConfig(process.cwd(), true);
  const profile = await mkdtemp(path.join(os.tmpdir(), "lineup-video-qa-"));
  const env = {
    ...process.env,
    AGENT_ACADEMY_QA_USER_DATA: profile,
    AGENT_ACADEMY_DEV_URL: origin,
    AGENT_ACADEMY_QA_HIDDEN: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await _electron.launch({
    executablePath: require("electron"),
    args: [path.resolve("desktop")],
    env,
    timeout: 45000,
  });
  const desktop = await app.firstWindow();
  desktop.setDefaultTimeout(10000);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].showInactive(),
  );
  await expect
    .poll(
      () =>
        desktop.evaluate(
          async () => (await window.agentAcademy.getSnapshot()).sourceStatus,
        ),
      { timeout: 20000 },
    )
    .not.toBe("initializing");
  await desktop.evaluate(async () => {
    const s = await window.agentAcademy.getSnapshot();
    if (s.sessionId)
      sessionStorage.setItem(
        "agent-academy:navigation:" + s.sessionId,
        s.agentLocked && s.agentSlug
          ? "/" + s.mapSlug + "/" + s.agentSlug
          : "/" + s.mapSlug,
      );
  });
  const response = await desktop.goto(origin + "/feed", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  expect(response.headers()["content-security-policy"]).toContain(
    "https://iframe.videodelivery.net",
  );
  await desktop.locator("article").first().waitFor();
  player = await openClip(desktop, reviewed[0].title);
  await expect(player.dialog.locator("header img").first()).toHaveAttribute(
    "src",
    catalog.maps[reviewed[0].mapSlug].splash,
  );
  await controls(player);
  await player.iframe.hover();
  await player.frame
    .getByRole("button", { name: "Enable Fullscreen", exact: true })
    .click();
  await expect
    .poll(() => desktop.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  // CDP keyboard events bypass Electron's before-input-event handler. Send
  // native key input to exercise the shell's real fullscreen Escape path.
  await app.evaluate(({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    contents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    contents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
  });
  await expect
    .poll(() => desktop.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
  await expect(desktop.getByRole("dialog")).toBeVisible();
  report.checks.push(
    "Electron: fullscreen permission and Escape return to the open detail",
  );
  const nativeShot = async (name) => {
    const encoded = await app.evaluate(async ({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      const pic = await w.capturePage();
      const [width, height] = w.getContentSize();
      return pic.resize({ width, height }).toPNG().toString("base64");
    });
    await writeFile(path.join(out, name), Buffer.from(encoded, "base64"));
  };
  await nativeShot("electron-wide.png");
  for (const record of reviewed) {
    player = await openClip(desktop, record.title);
    report.playback.push({
      runtime: "Electron",
      title: record.title,
      src: await player.iframe.getAttribute("src"),
      ...player.initial,
    });
    console.log("Electron playback OK: " + record.title);
  }
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(800, 700),
  );
  player = await openClip(desktop, reviewed[0].title);
  await fit(desktop);
  await nativeShot("electron-narrow.png");
  await player.dialog
    .getByRole("button", { name: "Close lineup details", exact: true })
    .click();
  await expect(desktop.getByRole("dialog")).toHaveCount(0);
  report.checks.push(
    "Electron: 800px window fit, close and reopen, all repaired Tracker entries decode and advance muted",
  );
  await youtubeGuide(desktop, "Electron");
  await app.close();
  app = null;
  report.success = true;
} catch (error) {
  report.success = false;
  report.errors.push(error.stack ?? String(error));
  console.error(error);
} finally {
  await browser?.close().catch(() => {});
  await app?.close().catch(() => {});
  await writeFile(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        success: report.success,
        checks: report.checks,
        playback: report.playback.length,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
  if (!report.success) process.exitCode = 1;
}
