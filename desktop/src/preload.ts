import { contextBridge, ipcRenderer } from "electron";
import { exposeClerkBridge } from "@clerk/electron/preload";
import {
  DESKTOP_CHANNELS,
  type DesktopBridge,
  type GameSnapshot,
} from "../../lib/desktop/protocol";

exposeClerkBridge();
// Match the web layout's overlay scrolling without reserving a Windows scrollbar
// column. Scrolling itself remains available by wheel, touchpad and keyboard.
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () =>
    document.documentElement.classList.add("desktop-runtime"),
  );
}
const bridge: DesktopBridge = {
  version: 1,
  preferences: {
    get: () => ipcRenderer.invoke(DESKTOP_CHANNELS.preferences, "get"),
    apply: (value) =>
      ipcRenderer.invoke(DESKTOP_CHANNELS.preferences, "apply", value),
    onOpen(listener) {
      ipcRenderer.on(DESKTOP_CHANNELS.openSettings, listener);
      return () =>
        ipcRenderer.removeListener(DESKTOP_CHANNELS.openSettings, listener);
    },
  },
  updates: {
    get: () => ipcRenderer.invoke(DESKTOP_CHANNELS.updates, "get"),
    check: () => ipcRenderer.invoke(DESKTOP_CHANNELS.updates, "check"),
    download: () => ipcRenderer.invoke(DESKTOP_CHANNELS.updates, "download"),
    install: () => ipcRenderer.invoke(DESKTOP_CHANNELS.updates, "install"),
    subscribe(listener) {
      const handler = (
        _event: Electron.IpcRendererEvent,
        state: import("../../lib/desktop/protocol").UpdateState,
      ) => listener(state);
      ipcRenderer.on(DESKTOP_CHANNELS.updateState, handler);
      return () =>
        ipcRenderer.removeListener(DESKTOP_CHANNELS.updateState, handler);
    },
  },
  copyBoardLink: (mapSlug, payload) =>
    ipcRenderer.invoke(DESKTOP_CHANNELS.copyBoard, mapSlug, payload),
  cache: {
    authorize: (token) =>
      ipcRenderer.invoke(DESKTOP_CHANNELS.cache, "authorize", token),
    read: (key, privateData) =>
      ipcRenderer.invoke(DESKTOP_CHANNELS.cache, "read", key, privateData),
    write: (key, value, privateData) =>
      ipcRenderer.invoke(
        DESKTOP_CHANNELS.cache,
        "write",
        key,
        privateData,
        value,
      ),
    image: (url, privateData) =>
      ipcRenderer.invoke(DESKTOP_CHANNELS.cache, "image", url, privateData),
  },
  getSnapshot: () => ipcRenderer.invoke(DESKTOP_CHANNELS.snapshot),
  subscribe(listener) {
    const handler = (
      _event: Electron.IpcRendererEvent,
      snapshot: GameSnapshot,
    ) => listener(snapshot);
    ipcRenderer.on(DESKTOP_CHANNELS.changed, handler);
    return () => ipcRenderer.removeListener(DESKTOP_CHANNELS.changed, handler);
  },
  window: {
    minimize: () => ipcRenderer.invoke(DESKTOP_CHANNELS.window, "minimize"),
    toggleMaximize: () =>
      ipcRenderer.invoke(DESKTOP_CHANNELS.window, "toggle-maximize"),
    close: () => ipcRenderer.invoke(DESKTOP_CHANNELS.window, "close"),
    isMaximized: () =>
      ipcRenderer.invoke(DESKTOP_CHANNELS.window, "is-maximized"),
    onState(listener) {
      const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) =>
        listener(maximized);
      ipcRenderer.on(DESKTOP_CHANNELS.windowState, handler);
      return () =>
        ipcRenderer.removeListener(DESKTOP_CHANNELS.windowState, handler);
    },
  },
};
contextBridge.exposeInMainWorld("agentAcademy", Object.freeze(bridge));
