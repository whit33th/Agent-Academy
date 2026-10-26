import { _electron, expect } from "@playwright/test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const executablePath = path.resolve(process.argv[2]);
const version = JSON.parse(
  await readFile("desktop/package.json", "utf8"),
).version;
const origin = `http://127.0.0.1:${process.env.AGENT_ACADEMY_DESKTOP_QA_PORT}`;
const out = path.resolve("outputs/desktop-video-release-qa");
await mkdir(out, { recursive: true });
const profile = await mkdtemp(path.join(out, "profile-"));
const catalog = JSON.parse(
  await readFile("lib/generated/valorant-catalog.json", "utf8"),
);
const app = await _electron.launch({
  executablePath,
  args: [`--user-data-dir=${profile}`],
  timeout: 60000,
});
const report = { expectedVersion: version, checks: [], success: false };
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  report.runtime = await app.evaluate(({ app, BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.showInactive();
    return {
      packaged: app.isPackaged,
      version: app.getVersion(),
      preferences: win.webContents.getLastWebPreferences(),
    };
  });
  expect(report.runtime.packaged).toBe(true);
  expect(report.runtime.version).toBe(version);
  expect(report.runtime.preferences.contextIsolation).toBe(true);
  expect(report.runtime.preferences.nodeIntegration).toBe(false);
  await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 60000 });
  await expect
    .poll(
      () =>
        page.evaluate(
          async () => (await window.agentAcademy.getSnapshot()).sourceStatus,
        ),
      { timeout: 30000 },
    )
    .not.toBe("initializing");
  await page.evaluate(async () => {
    const state = await window.agentAcademy.getSnapshot();
    if (state.sessionId)
      sessionStorage.setItem(
        "agent-academy:navigation:" + state.sessionId,
        "/" +
          state.mapSlug +
          (state.agentLocked && state.agentSlug ? "/" + state.agentSlug : ""),
      );
  });
  const response = await page.goto(origin + "/feed", {
    waitUntil: "domcontentloaded",
  });
  expect(response.headers()["content-security-policy"]).toContain(
    "https://iframe.videodelivery.net",
  );
  await page
    .getByRole("button", {
      name: "View B Main Haunt from the B Site cover notch",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("header img").first()).toHaveAttribute(
    "src",
    catalog.maps.abyss.splash,
  );
  const iframe = dialog.locator("iframe");
  await expect(iframe).toBeVisible();
  const frame = dialog.frameLocator("iframe");
  const video = frame.locator("video");
  await expect
    .poll(() => video.evaluate((v) => v.currentTime), { timeout: 30000 })
    .toBeGreaterThan(0.2);
  report.video = await video.evaluate((v) => ({
    muted: v.muted,
    paused: v.paused,
    time: v.currentTime,
    width: v.videoWidth,
    duration: v.duration,
  }));
  expect(report.video.muted).toBe(true);
  expect(report.video.paused).toBe(false);
  expect(report.video.width).toBeGreaterThan(0);
  await expect
    .poll(() => video.evaluate((v) => v.currentTime))
    .toBeGreaterThan(report.video.time + 0.1);
  await iframe.hover();
  await frame
    .getByRole("button", { name: "Enable Fullscreen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await app.evaluate(({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    contents.sendInputEvent({ type: "keyDown", keyCode: "Escape" });
    contents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
  await expect(dialog).toBeVisible();
  await page.screenshot({
    path: path.join(out, "packaged-player.png"),
    scale: "css",
  });
  await dialog
    .getByRole("button", { name: "Close lineup details", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  report.checks.push(
    "Packaged version and isolated renderer",
    "Live feed and map splash artwork",
    "Tracker decodes and advances muted automatically",
    "Fullscreen and native Escape",
    "Detail closes normally",
  );
  report.success = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  throw error;
} finally {
  await app.close().catch(() => {});
  await writeFile(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        version,
        success: report.success,
        checks: report.checks,
        video: report.video,
        error: report.error,
      },
      null,
      2,
    ),
  );
}
