"use client";

import { Suspense, useSyncExternalStore } from "react";
import AudioSettingsHUD from "@/components/AudioSettingsHUD";
import LiveSyncStatus from "@/components/hud/LiveSyncStatus";
import BackLink from "@/components/layout/BackLink";

let maximized = false;
let stopWindowState: (() => void) | undefined;
const windowListeners = new Set<() => void>();

function emitWindow() {
  for (const listener of windowListeners) listener();
}

function subscribeMaximized(listener: () => void) {
  windowListeners.add(listener);
  const controls = window.agentAcademy?.window;
  if (controls && !stopWindowState) {
    stopWindowState = controls.onState((value) => {
      if (maximized === value) return;
      maximized = value;
      emitWindow();
    });
    queueMicrotask(() => {
      void controls.isMaximized().then((value) => {
        if (maximized === value) return;
        maximized = value;
        emitWindow();
      }).catch(() => {});
    });
  }
  return () => {
    windowListeners.delete(listener);
    if (windowListeners.size) return;
    stopWindowState?.();
    stopWindowState = undefined;
    maximized = false;
  };
}

function useMaximized() {
  return useSyncExternalStore(subscribeMaximized, () => maximized, () => false);
}

function run(action: "minimize" | "toggleMaximize" | "close") {
  const controls = window.agentAcademy?.window;
  if (!controls) return;
  void controls[action]();
}

const controlClass = "flex w-[46px] items-center justify-center text-val-cream/55 transition-colors hover:bg-white/8 hover:text-val-cream focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-val-red";

export default function DesktopTitleBar() {
  const isMaximized = useMaximized();

  return (
    <header className="desktop-titlebar" aria-label="Window">
      <div className="desktop-titlebar-controls flex h-full min-w-0 items-center pl-4 md:pl-6 lg:pl-8">
        <Suspense fallback={null}>
          <BackLink chrome />
        </Suspense>
      </div>
      <div className="min-w-6 flex-1" onDoubleClick={() => run("toggleMaximize")} />
      <div className="desktop-titlebar-controls flex h-full min-w-0 shrink-0 items-stretch">
        <div id="titlebar-account" className="flex h-full items-stretch" />
        <AudioSettingsHUD chrome />
        <Suspense fallback={null}>
          <LiveSyncStatus chrome />
        </Suspense>
        <div className="mx-3 my-auto h-4 w-px shrink-0 bg-white/10" aria-hidden />
        <div className="flex h-full shrink-0" role="group" aria-label="Window controls">
          <button type="button" className={controlClass} aria-label="Minimize" onClick={() => run("minimize")}>
            <WindowGlyph><path d="M2 6.5h8" /></WindowGlyph>
          </button>
          <button type="button" className={controlClass} aria-label={isMaximized ? "Restore" : "Maximize"} onClick={() => run("toggleMaximize")}>
            {isMaximized ? <RestoreGlyph /> : <WindowGlyph><rect x="2.25" y="2.25" width="7.5" height="7.5" /></WindowGlyph>}
          </button>
          <button type="button" className="flex w-[46px] items-center justify-center text-val-cream/70 transition-colors hover:bg-val-red hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-white" aria-label="Close" onClick={() => run("close")}>
            <WindowGlyph><path d="M3 3l6 6M9 3 3 9" /></WindowGlyph>
          </button>
        </div>
      </div>
    </header>
  );
}

function WindowGlyph({ children }: { children: React.ReactNode }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.1">
      {children}
    </svg>
  );
}

function RestoreGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.1">
      <path d="M4 2.4h5.6V8" />
      <rect x="2.2" y="4.2" width="5.6" height="5.6" />
    </svg>
  );
}
