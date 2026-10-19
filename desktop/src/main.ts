import { app, BrowserWindow, dialog, ipcMain, Menu, Tray, shell } from "electron";
import { createClerkBridge } from "@clerk/electron";
import { storage } from "@clerk/electron/storage";
import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AUTH_SCHEME, DESKTOP_CHANNELS, DESKTOP_ORIGIN, initialSnapshot } from "../../lib/desktop/protocol";
import { startWebServer } from "./web-server";
import { startDetector } from "./detector";
import { retireLegacyHelper } from "./legacy-helper";

if (!app.isPackaged && process.env.AGENT_ACADEMY_QA_USER_DATA) app.setPath("userData", process.env.AGENT_ACADEMY_QA_USER_DATA);
app.setAppUserModelId("com.whit33th.agentacademy.native");
const primary = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let stopServer: (() => void) | undefined;
let snapshot = initialSnapshot();
let stopDetector: (() => void) | undefined;
const clerk = primary ? createClerkBridge({
  storage: storage({ path: app.getPath("userData"), unencryptedFallback: false }),
  renderer: { scheme: AUTH_SCHEME, host: "auth" },
  manageSingleInstanceLock: false,
}) : null;

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}
app.on("second-instance", showWindow);
if (!primary) app.quit();
else void app.whenReady().then(start).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Startup failed");
  dialog.showErrorBox("Agent Academy", error instanceof Error ? error.message : "The app could not start.");
  app.quit();
});

async function writableWebCopy() {
  const source = app.isPackaged ? path.join(process.resourcesPath, "web") : path.resolve(app.getAppPath(), "../desktop-build/web");
  const buildId = (await readFile(path.join(source, ".next/BUILD_ID"), "utf8")).trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(buildId)) throw new Error("Invalid bundled build ID.");
  const target = path.join(app.getPath("userData"), "web", buildId);
  try {
    await access(path.join(target, "node_modules/next/package.json"));
    if ((await readFile(path.join(target, ".ready"), "utf8")) === buildId) return target;
  } catch { /* New or incomplete build. */ }
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, dereference: true });
  await writeFile(path.join(target, ".ready"), buildId);
  return target;
}

async function start() {
  await retireLegacyHelper(app.getPath("userData"));
  const devUrl = !app.isPackaged ? process.env.AGENT_ACADEMY_DEV_URL : undefined;
  if (devUrl && devUrl !== "http://127.0.0.1:3000") throw new Error("Only the local Next.js development origin is allowed.");
  const origin = devUrl ?? DESKTOP_ORIGIN;
  if (!devUrl) stopServer = await startWebServer(await writableWebCopy());
  Menu.setApplicationMenu(null);
  const icon = app.isPackaged ? path.join(process.resourcesPath, "web/public/valorant-icon.png") : path.resolve(app.getAppPath(), "../public/valorant-icon.png");
  mainWindow = new BrowserWindow({
    title: "Agent Academy", width: 1440, height: 900, minWidth: 800, minHeight: 600,
    useContentSize: true, show: false, autoHideMenuBar: true, backgroundColor: "#0a0a0a", icon,
    webPreferences: { preload: path.join(app.getAppPath(), "dist/preload.cjs"), sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, backgroundThrottling: false },
  });
  ipcMain.handle(DESKTOP_CHANNELS.snapshot, (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || new URL(event.senderFrame.url).origin !== origin)
      throw new Error("Unauthorized game-state request.");
    return snapshot;
  });
  mainWindow.webContents.on("will-navigate", (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  mainWindow.webContents.on("will-redirect", (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith("https://")) void shell.openExternal(url); return { action: "deny" }; });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.on("close", (event) => { if (!quitting) { event.preventDefault(); mainWindow?.hide(); } });
  mainWindow.once("ready-to-show", () => { if (process.env.AGENT_ACADEMY_QA_HIDDEN !== "1") mainWindow?.show(); });
  tray = new Tray(icon);
  tray.setToolTip("Agent Academy");
  const updateTray = () => tray?.setContextMenu(Menu.buildFromTemplate([
    { label: "Открыть", click: showWindow },
    { label: "Автозапуск Windows", type: "checkbox", checked: app.getLoginItemSettings().openAtLogin, enabled: app.isPackaged, click: (item) => { app.setLoginItemSettings({ openAtLogin: item.checked }); updateTray(); } },
    { type: "separator" }, { label: "Выйти", click: () => app.quit() },
  ]));
  updateTray();
  tray.on("double-click", showWindow);
  stopDetector = startDetector(next => {
    snapshot = { ...next, revision: snapshot.revision + 1 };
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(DESKTOP_CHANNELS.changed, snapshot);
  });
  await mainWindow.loadURL(origin);
}
app.on("window-all-closed", () => { /* The tray keeps detection alive. */ });
app.on("before-quit", () => { quitting = true; stopDetector?.(); stopServer?.(); clerk?.cleanup(); tray?.destroy(); });
