"use client";
import {
  DEFAULT_PREFERENCES,
  isAppPreferences,
  type AppPreferences,
} from "./model";
const PREFIX = "agent-academy:preferences:v1:";
const listeners = new Set<() => void>();
const snapshots = new Map<
  string,
  { raw: string | null; value: AppPreferences }
>();
export function hasPreferences(scope: string) {
  try {
    return isAppPreferences(
      JSON.parse(localStorage.getItem(PREFIX + scope) ?? "null"),
    );
  } catch {
    return false;
  }
}
export function readPreferences(scope: string): AppPreferences {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PREFIX + scope);
  } catch {
    return DEFAULT_PREFERENCES;
  }
  const saved = snapshots.get(scope);
  if (saved?.raw === raw) return saved.value;
  let value: AppPreferences = DEFAULT_PREFERENCES;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isAppPreferences(parsed)) value = parsed;
    else if (!raw && scope === "guest") {
      const volume = localStorage.getItem("vp_master_volume");
      const music = localStorage.getItem("vp_ambient_enabled");
      value = {
        ...DEFAULT_PREFERENCES,
        ...(music === "false" ? { musicEnabled: false } : {}),
        ...(volume !== null && Number.isFinite(Number(volume))
          ? {
              musicVolume: Math.max(0, Math.min(1, Number(volume))),
              effectsVolume: Math.max(0, Math.min(1, Number(volume))),
            }
          : {}),
      };
    }
  } catch {
    /* Invalid preferences use safe defaults. */
  }
  snapshots.set(scope, { raw, value });
  return value;
}
export function writePreferences(scope: string, value: AppPreferences) {
  if (!isAppPreferences(value)) throw new Error("Invalid settings.");
  const raw = JSON.stringify(value);
  localStorage.setItem(PREFIX + scope, raw);
  snapshots.set(scope, { raw, value });
  for (const listener of listeners) listener();
}
export function subscribePreferences(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
