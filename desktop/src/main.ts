import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  Tray,
  shell,
} from "electron";
import { createClerkBridge } from "@clerk/electron";
import { autoUpdater } from "electron-updater";
import { createNativePreferences } from "./native-preferences";
import { createUpdateController } from "./update-controller";
import { createUpdateLog } from "./update-log";
import { storage } from "@clerk/electron/storage";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AUTH_SCHEME,
  DESKTOP_CHANNELS,
  DESKTOP_ORIGIN,
  DESKTOP_REQUEST_HEADER,
  initialSnapshot,
} from "../../lib/desktop/protocol";
import { startWebServer } from "./web-server";
import { startDetector } from "./detector";
import { retireLegacyHelper } from "./legacy-helper";
import { createCollectionCache } from "./collection-cache";
import { clerkIssuer } from "./cache-session";
import {
  boardDestination,
  createBoardLink,
} from "../../lib/desktop/board-links";
import { readValorantAimSettings } from "./aim-settings";
import { rendererPermissionAllowed } from "../../lib/desktop/renderer-permissions";

const profileDirectory =
  app.commandLine.getSwitchValue("user-data-dir") ||
  (!app.isPackaged ? process.env.AGENT_ACADEMY_QA_USER_DATA : undefined);
if (profileDirectory) {
  app.setPath("userData", path.resolve(profileDirectory));
  app.setPath("sessionData", path.resolve(profileDirectory));
}
app.setAppUserModelId("com.whit33th.agentacademy.native");
const primary = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;
let rendererReady = false;
let pageOrigin = DESKTOP_ORIGIN;
let tray: Tray | null = null;
let nativePreferences: Awaited<
  ReturnType<typeof createNativePreferences>
> | null = null;
let quitting = false;
let stopServer: (() => void) | undefined;
let snapshot = initialSnapshot();
let stopDetector: (() => void) | undefined;
let pendingBoard = process.argv.map(boardDestination).find(Boolean) ?? null;
const clerk = primary
  ? createClerkBridge({
      storage: storage({
        path: app.getPath("userData"),
        unencryptedFallback: false,
      }),
      renderer: { scheme: AUTH_SCHEME, host: "auth" },
      manageSingleInstanceLock: false,
    })
  : null;

function trustedMainFrame(event: Electron.IpcMainInvokeEvent) {
  const frame = event.senderFrame;
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    frame !== mainWindow.webContents.mainFrame
  )
    return false;
  try {
    return new URL(frame.url).origin === pageOrigin;
  } catch {
    return false;
  }
}
let windowChangedAt = 0;
function publishWindowState() {
  windowChangedAt = Date.now();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(
    DESKTOP_CHANNELS.windowState,
    mainWindow.isMaximized(),
  );
}
function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}
function openBoardLink(link: string) {
  const destination = boardDestination(link);
  if (!destination) return;
  pendingBoard = destination;
  openPendingBoard();
}
function openPendingBoard() {
  if (
    pendingBoard &&
    rendererReady &&
    mainWindow &&
    !mainWindow.isDestroyed()
  ) {
    const destination = pendingBoard;
    pendingBoard = null;
    void mainWindow
      .loadURL(`${pageOrigin}${destination}`)
      .catch((error: unknown) => {
        console.error("Could not open the shared board:", error);
      });
    showWindow();
  }
}
app.on("open-url", (event, link) => {
  if (boardDestination(link)) {
    event.preventDefault();
    openBoardLink(link);
  }
});
app.on("second-instance", (_event, args) => {
  for (const arg of args) openBoardLink(arg);
  showWindow();
});
if (!primary) app.quit();
else
  void app
    .whenReady()
    .then(start)
    .catch((error: unknown) => {
      if (quitting) return;
      console.error(error instanceof Error ? error.message : "Startup failed");
      dialog.showErrorBox(
        "Agent Academy",
        error instanceof Error ? error.message : "The app could not start.",
      );
      app.quit();
    });

async function bundledWebRoot() {
  const source = app.isPackaged
    ? path.join(process.resourcesPath, "web")
    : path.resolve(app.getAppPath(), "../desktop-build/web");
  const buildId = (
    await readFile(path.join(source, ".next/BUILD_ID"), "utf8")
  ).trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(buildId))
    throw new Error("Invalid bundled build ID.");
  return source;
}

async function start() {
  nativePreferences = await createNativePreferences(app.getPath("userData"), {
    getAutoStart: () => app.getLoginItemSettings().openAtLogin,
    setAutoStart: (openAtLogin) => {
      if (!app.isPackaged || process.platform !== "win32")
        throw new Error("Automatic startup is available in the Windows app.");
      app.setLoginItemSettings({ openAtLogin, path: app.getPath("exe") });
    },
  });
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.disableDifferentialDownload = false;
  autoUpdater.disableWebInstaller = true;
  const updateLog = createUpdateLog(path.join(app.getPath("userData"), "logs"));
  updateLog.write("startup", {
    currentVersion: app.getVersion(),
    packaged: app.isPackaged,
  });
  let previousUpdateStatus = "";
  const updates = createUpdateController(
    autoUpdater,
    app.getVersion(),
    (state) => {
      if (state.status !== previousUpdateStatus) {
        previousUpdateStatus = state.status;
        updateLog.write("state", { ...state });
      }
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send(DESKTOP_CHANNELS.updateState, state);
    },
    (error, state) => updateLog.write("error", { ...state }, error),
  );
  await retireLegacyHelper(app.getPath("userData"));
  const devUrl = !app.isPackaged
    ? process.env.AGENT_ACADEMY_DEV_URL
    : undefined;
  if (devUrl && devUrl !== "http://127.0.0.1:3000")
    throw new Error("Only the local Next.js development origin is allowed.");
  const origin = (pageOrigin = devUrl ?? DESKTOP_ORIGIN);
  const webRoot = devUrl ? null : await bundledWebRoot();
  const publicConfig: Record<string, string> = webRoot
    ? JSON.parse(
        await readFile(path.join(webRoot, "desktop-public-env.json"), "utf8"),
      )
    : (Object.fromEntries(
        Object.entries(process.env).filter(
          ([key, value]) =>
            key.startsWith("NEXT_PUBLIC_") && typeof value === "string",
        ),
      ) as Record<string, string>);
  if (webRoot)
    stopServer = await startWebServer(webRoot, undefined, () => {
      dialog.showErrorBox(
        "Agent Academy",
        "The local interface stopped unexpectedly. Restart Agent Academy to continue. Your collection has been preserved.",
      );
      app.quit();
    });
  if (quitting) {
    stopServer?.();
    return;
  }
  const collectionCache =
    publicConfig.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    publicConfig.NEXT_PUBLIC_CONVEX_URL
      ? createCollectionCache(
          path.join(app.getPath("userData"), "collection-cache"),
          publicConfig,
        )
      : async () => null;
  Menu.setApplicationMenu(null);
  const icon = app.isPackaged
    ? path.join(process.resourcesPath, "web/public/valorant-icon.png")
    : path.resolve(app.getAppPath(), "../public/valorant-icon.png");
  mainWindow = new BrowserWindow({
    title: "Agent Academy",
    width: 1440,
    height: 940,
    minWidth: 800,
    minHeight: 640,
    useContentSize: true,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0a",
    icon,
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist/preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });
  ipcMain.handle(DESKTOP_CHANNELS.snapshot, (event) => {
    if (!trustedMainFrame(event))
      throw new Error("Unauthorized game-state request.");
    return snapshot;
  });
  ipcMain.handle(
    DESKTOP_CHANNELS.preferences,
    (event, action: unknown, value: unknown) => {
      if (!trustedMainFrame(event) || !nativePreferences)
        throw new Error("Unauthorized settings request.");
      if (action === "get") return nativePreferences.get();
      if (action === "apply") return nativePreferences.apply(value);
      throw new Error("Unknown settings action.");
    },
  );
  ipcMain.handle(DESKTOP_CHANNELS.updates, (event, action: unknown) => {
    if (!trustedMainFrame(event))
      throw new Error("Unauthorized update request.");
    if (action === "get") return updates.get();
    if (!app.isPackaged)
      throw new Error("Install the Windows build to check for updates.");
    if (action === "check") return updates.check();
    if (action === "download") return updates.download();
    if (action === "install") return updates.install();
    throw new Error("Unknown update action.");
  });
  ipcMain.handle(
    DESKTOP_CHANNELS.cache,
    (
      event,
      action: unknown,
      key: unknown,
      privateData: unknown,
      value: unknown,
    ) => {
      if (!trustedMainFrame(event))
        throw new Error("Unauthorized cache request.");
      return collectionCache(action, key, privateData, value);
    },
  );
  ipcMain.handle(
    DESKTOP_CHANNELS.copyBoard,
    (event, mapSlug: unknown, payload: unknown) => {
      if (
        !trustedMainFrame(event) ||
        typeof mapSlug !== "string" ||
        typeof payload !== "string"
      )
        throw new Error("Invalid board share request.");
      clipboard.writeText(createBoardLink(mapSlug, payload));
    },
  );
  const suspendAim = () => {
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send(DESKTOP_CHANNELS.aimSuspended);
  };
  ipcMain.handle(DESKTOP_CHANNELS.aim, async (event, action: unknown) => {
    if (!trustedMainFrame(event) || !mainWindow)
      throw new Error("Unauthorized aim request.");
    if (action === "settings") return readValorantAimSettings();
    throw new Error("Unknown aim action.");
  });
  mainWindow.on("blur", suspendAim);
  mainWindow.on("hide", suspendAim);
  mainWindow.on("minimize", suspendAim);
  mainWindow.on("leave-full-screen", suspendAim);
  let htmlFullscreen = false;
  mainWindow.webContents.on("enter-html-full-screen", () => {
    htmlFullscreen = true;
  });
  mainWindow.webContents.on("leave-html-full-screen", () => {
    htmlFullscreen = false;
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (htmlFullscreen && input.type === "keyDown" && input.key === "Escape") {
      event.preventDefault();
      // Escape first leaves the video player; a second press closes the modal.
      void mainWindow?.webContents
        .executeJavaScript("document.exitFullscreen()")
        .catch(() => {});
    }
  });
  mainWindow.webContents.on("did-navigate", suspendAim);
  mainWindow.webContents.on("did-navigate-in-page", (_event, url) => {
    if (new URL(url).pathname !== "/aim") {
      suspendAim();
    }
  });
  ipcMain.handle(DESKTOP_CHANNELS.window, (event, action: unknown) => {
    if (!trustedMainFrame(event) || !mainWindow)
      throw new Error("Unauthorized window request.");
    if (action === "minimize") return mainWindow.minimize();
    if (action === "toggle-maximize") {
      if (Date.now() - windowChangedAt < 250) return;
      return mainWindow.isMaximized()
        ? mainWindow.unmaximize()
        : mainWindow.maximize();
    }
    if (action === "close") return mainWindow.close();
    if (action === "is-maximized") return mainWindow.isMaximized();
    throw new Error("Unknown window action.");
  });
  mainWindow.on("maximize", publishWindowState);
  mainWindow.on("unmaximize", publishWindowState);
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  mainWindow.webContents.on("will-redirect", (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      callback(
        webContents === mainWindow?.webContents &&
          rendererPermissionAllowed(permission, details.requestingUrl, origin),
      );
    },
  );
  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) =>
      webContents === mainWindow?.webContents &&
      rendererPermissionAllowed(permission, requestingOrigin, origin),
  );
  const authOrigin = publicConfig.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? clerkIssuer(publicConfig.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    : "";
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: [`${origin}/*`] },
    (details, callback) => {
      const policy = [
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        `script-src 'self' 'unsafe-inline' ${devUrl ? "'unsafe-eval'" : ""} ${authOrigin} https://challenges.cloudflare.com https://*.protect.clerk.com`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://cdn.sanity.io https://*.convex.cloud https://img.clerk.com",
        `connect-src 'self' ${devUrl ? "ws://127.0.0.1:3000" : ""} ${authOrigin} ${publicConfig.NEXT_PUBLIC_CONVEX_URL ?? ""} ${publicConfig.NEXT_PUBLIC_CONVEX_URL?.replace("https://", "wss://") ?? ""} ${publicConfig.NEXT_PUBLIC_CONVEX_SITE_URL ?? publicConfig.NEXT_PUBLIC_CONVEX_URL?.replace(".cloud", ".site") ?? ""} https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.clerk-telemetry.com`,
        "frame-src https://challenges.cloudflare.com https://*.protect.clerk.com https://www.youtube-nocookie.com https://iframe.videodelivery.net",
        "font-src 'self' data:",
        "media-src 'self' data: blob:",
        "worker-src 'self' blob:",
        "form-action 'self'",
      ].join("; ");
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [policy],
          "X-Content-Type-Options": ["nosniff"],
        },
      });
    },
  );
  mainWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      if (nativePreferences?.get().closeToTray ?? true) mainWindow?.hide();
      else app.quit();
    }
  });
  mainWindow.once("ready-to-show", () => {
    if (process.env.AGENT_ACADEMY_QA_HIDDEN !== "1") mainWindow?.show();
  });
  tray = new Tray(icon);
  tray.setToolTip("Agent Academy");
  const updateTray = () =>
    tray?.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open", click: showWindow },
        {
          label: "Settings",
          click: () => {
            showWindow();
            mainWindow?.webContents.send(DESKTOP_CHANNELS.openSettings);
          },
        },
        { type: "separator" },
        { label: "Quit", click: () => app.quit() },
      ]),
    );
  updateTray();
  tray.on("double-click", showWindow);
  stopDetector = startDetector((next) => {
    snapshot = { ...next, revision: snapshot.revision + 1 };
    if (mainWindow && !mainWindow.isDestroyed())
      mainWindow.webContents.send(DESKTOP_CHANNELS.changed, snapshot);
  });
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: [`${origin}/*`] },
    (details, callback) => {
      details.requestHeaders[DESKTOP_REQUEST_HEADER] = "1";
      callback({ requestHeaders: details.requestHeaders });
    },
  );
  const initialDestination = pendingBoard;
  pendingBoard = null;
  await mainWindow
    .loadURL(initialDestination ? `${origin}${initialDestination}` : origin)
    .catch((error: unknown) => {
      if (quitting) return;
      const cancelled =
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ERR_ABORTED";
      if (
        cancelled &&
        mainWindow &&
        !mainWindow.isDestroyed() &&
        new URL(mainWindow.webContents.getURL()).origin === origin
      )
        return;
      throw error;
    });
  if (quitting) return;
  rendererReady = true;
  openPendingBoard();
}
app.on("window-all-closed", () => {
  if (!quitting && !nativePreferences?.get().closeToTray) app.quit();
});
app.on("before-quit", () => {
  quitting = true;
  stopDetector?.();
  stopServer?.();
  tray?.destroy();
});
app.on("will-quit", () => clerk?.cleanup());
