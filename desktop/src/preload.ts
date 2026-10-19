import { contextBridge, ipcRenderer } from "electron";
import { exposeClerkBridge } from "@clerk/electron/preload";
import { DESKTOP_CHANNELS, type DesktopBridge, type GameSnapshot } from "../../lib/desktop/protocol";

exposeClerkBridge();
// Match the web layout's overlay scrolling without reserving a Windows scrollbar
// column. Scrolling itself remains available by wheel, touchpad and keyboard.
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => document.documentElement.classList.add("desktop-runtime"));
}
const bridge: DesktopBridge = {
  version: 1,
  getSnapshot: () => ipcRenderer.invoke(DESKTOP_CHANNELS.snapshot),
  subscribe(listener) {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: GameSnapshot) => listener(snapshot);
    ipcRenderer.on(DESKTOP_CHANNELS.changed, handler);
    return () => ipcRenderer.removeListener(DESKTOP_CHANNELS.changed, handler);
  },
  window: {
    minimize: () => ipcRenderer.invoke(DESKTOP_CHANNELS.window, "minimize"),
    toggleMaximize: () => ipcRenderer.invoke(DESKTOP_CHANNELS.window, "toggle-maximize"),
    close: () => ipcRenderer.invoke(DESKTOP_CHANNELS.window, "close"),
    isMaximized: () => ipcRenderer.invoke(DESKTOP_CHANNELS.window, "is-maximized"),
    onState(listener) {
      const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => listener(maximized);
      ipcRenderer.on(DESKTOP_CHANNELS.windowState, handler);
      return () => ipcRenderer.removeListener(DESKTOP_CHANNELS.windowState, handler);
    },
  },
};
contextBridge.exposeInMainWorld("agentAcademy", Object.freeze(bridge));
