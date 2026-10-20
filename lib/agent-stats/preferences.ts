"use client";
import { isStatsDivision, type StatsDivision } from "./model";

const PREFIX = "agent-academy:stats-rank:v1:";
const listeners = new Set<() => void>();
export function readStatsRank(scope: string): StatsDivision {
  try {
    const value = localStorage.getItem(PREFIX + scope);
    return isStatsDivision(value) ? value : "all";
  } catch {
    return "all";
  }
}
export function writeStatsRank(scope: string, division: StatsDivision) {
  if (!isStatsDivision(division)) return;
  try {
    localStorage.setItem(PREFIX + scope, division);
  } catch {
    /* Unavailable storage keeps the default. */
  }
  for (const listener of listeners) listener();
}
export function subscribeStatsRank(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(PREFIX)) listener();
  };
  window.addEventListener("storage", storage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", storage);
  };
}
