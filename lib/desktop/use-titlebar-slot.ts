"use client";

import { useSyncExternalStore } from "react";

const slots = new Map<string, HTMLElement | null>();
const listeners = new Map<string, Set<() => void>>();

function emit(id: string) {
  for (const listener of listeners.get(id) ?? []) listener();
}

function subscribe(id: string, listener: () => void) {
  const group = listeners.get(id) ?? new Set<() => void>();
  group.add(listener);
  listeners.set(id, group);
  queueMicrotask(() => {
    const next = document.documentElement.classList.contains("desktop-runtime")
      ? document.getElementById(id)
      : null;
    if (next === (slots.get(id) ?? null)) return;
    slots.set(id, next);
    emit(id);
  });
  return () => {
    group.delete(listener);
  };
}

export function useTitlebarSlot(id: string) {
  return useSyncExternalStore(
    (listener) => subscribe(id, listener),
    () => slots.get(id) ?? null,
    () => null,
  );
}
