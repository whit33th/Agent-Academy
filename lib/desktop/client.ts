"use client";
import { useSyncExternalStore } from "react";
import type { GameSnapshot } from "./protocol";
let current: GameSnapshot | null = null;
const listeners = new Set<() => void>();
let disconnect: (() => void) | undefined;
function receive(snapshot: GameSnapshot) {
  if (current && snapshot.revision < current.revision) return;
  current = snapshot;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!disconnect && window.agentAcademy) {
    disconnect = window.agentAcademy.subscribe(receive);
    void window.agentAcademy
      .getSnapshot()
      .then(receive)
      .catch(() => {});
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      disconnect?.();
      disconnect = undefined;
    }
  };
}
export function useGameSnapshot() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
