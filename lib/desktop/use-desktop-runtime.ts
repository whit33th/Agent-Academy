"use client";

import { useSyncExternalStore } from "react";

let desktop = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  queueMicrotask(() => {
    const next = document.documentElement.classList.contains("desktop-runtime");
    if (next === desktop) return;
    desktop = next;
    emit();
  });
  return () => {
    listeners.delete(listener);
  };
}

export function useDesktopRuntime(knownOnServer = false) {
  return useSyncExternalStore(subscribe, () => desktop || knownOnServer, () => knownOnServer);
}
