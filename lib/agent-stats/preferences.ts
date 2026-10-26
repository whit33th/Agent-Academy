"use client";
import { isStatsDivision, type StatsDivision } from "./model";

const PREFIX = "agent-academy:stats-rank:v1:";
const listeners = new Set<() => void>();
// Keep the control usable when persistent storage is denied or full.
const sessionRanks = new Map<string, StatsDivision>();
export function readStatsRank(scope: string): StatsDivision {
  const sessionRank = sessionRanks.get(scope);
  if (sessionRank) return sessionRank;
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
    sessionRanks.delete(scope);
  } catch {
    sessionRanks.set(scope, division);
  }
  for (const listener of listeners) listener();
}
export function subscribeStatsRank(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => {
    if (event.key === null) {
      sessionRanks.clear();
      listener();
    } else if (event.key.startsWith(PREFIX)) {
      sessionRanks.delete(event.key.slice(PREFIX.length));
      listener();
    }
  };
  window.addEventListener("storage", storage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", storage);
  };
}
