import { _electron } from "@playwright/test";
import { appendFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
const executablePath = path.resolve(
  process.argv[2] ?? "release/win-unpacked/Agent Academy.exe",
);
await mkdir("outputs", { recursive: true });
const profile = await mkdtemp(path.resolve("outputs/smoke-profile-"));
const app = await _electron.launch({
  executablePath,
  args: ["--force-device-scale-factor=1", `--user-data-dir=${profile}`],
  timeout: 60000,
});
let result;
await writeFile("outputs/smoke-runtime.log", "");
app.process().stderr?.on("data", (data) => {
  void appendFile("outputs/smoke-runtime.log", data);
});
app.process().stdout?.on("data", (data) => {
  void appendFile("outputs/smoke-runtime.log", data);
});
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.agentAcademy?.version === 1);
  result = await app.evaluate(({ app, BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const preferences = window.webContents.getLastWebPreferences();
    return {
      packaged: app.isPackaged,
      autostart: app.getLoginItemSettings().openAtLogin,
      contextIsolation: preferences.contextIsolation,
      sandbox: preferences.sandbox,
      nodeIntegration: preferences.nodeIntegration,
    };
  });
  result.snapshot = await page.evaluate(() =>
    window.agentAcademy.getSnapshot(),
  );
  result.rendererNodeAccess = await page.evaluate(
    () => typeof window.require !== "undefined",
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].close(),
  );
  result.closeHidesWindow = await app.evaluate(
    ({ BrowserWindow }) => !BrowserWindow.getAllWindows()[0].isVisible(),
  );
  if (
    !result.packaged ||
    !result.contextIsolation ||
    !result.sandbox ||
    result.nodeIntegration ||
    result.rendererNodeAccess ||
    !result.closeHidesWindow
  )
    throw new Error("Native smoke check failed");
} finally {
  const child = app.process();
  const exited = new Promise((resolve) => child.once("exit", resolve));
  await app.close().catch(() => undefined);
  const finished = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 10000).unref()),
  ]);
  if (!finished) {
    child.kill();
    throw new Error("The application did not quit cleanly.");
  }
}
result.cleanQuit = true;
const closeApp = await _electron.launch({
  executablePath,
  args: [`--user-data-dir=${profile}`],
  timeout: 60000,
});
const closeChild = closeApp.process();
try {
  const page = await closeApp.firstWindow();
  await page.waitForFunction(() => window.agentAcademy?.version === 1);
  await page.evaluate(async () => {
    const current = await window.agentAcademy.preferences.get();
    await window.agentAcademy.preferences.apply({
      ...current,
      closeToTray: false,
    });
  });
  const exited = new Promise((resolve) => closeChild.once("exit", resolve));
  const windowClosed = page.waitForEvent("close", { timeout: 10000 });
  await closeApp.evaluate(({ BrowserWindow }) => {
    setTimeout(() => BrowserWindow.getAllWindows()[0].close(), 0);
  });
  // Node's inspector keeps a quitting process alive until Playwright detaches.
  // A hidden tray window would still exist if the native close setting failed.
  await windowClosed;
  await closeApp.close().catch(() => undefined);
  result.closeExitsWhenTrayDisabled = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 10000).unref()),
  ]);
  if (!result.closeExitsWhenTrayDisabled)
    throw new Error("Closing with tray disabled did not exit cleanly.");
} finally {
  if (closeChild.exitCode === null) closeChild.kill();
}
result.executablePath = executablePath;
await writeFile("outputs/desktop-smoke.json", JSON.stringify(result, null, 2));
console.log(
  "Packaged app, isolated renderer, tray/exit preferences and clean early quit verified.",
);
