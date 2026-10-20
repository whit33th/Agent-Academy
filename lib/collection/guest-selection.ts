"use client";

import { useSyncExternalStore } from "react";
import { isMapSlug, isAgentSlug } from "@/lib/catalog/lineup-options";
import { getViabilityTier } from "@/lib/utils/viability";
import type { MapPreference, AgentPreference } from "./selection";

interface GuestSelection {
  maps: MapPreference[];
  roster: AgentPreference[];
}

const KEY = "agent-academy:guest-selection:v1";
const EMPTY: GuestSelection = { maps: [], roster: [] };
const listeners = new Set<() => void>();
let serialized: string | null | undefined;
let snapshot = EMPTY;

function read(): GuestSelection {
  let value: string | null;
  try {
    value = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (value === serialized) return snapshot;
  serialized = value;
  snapshot = EMPTY;
  if (!value) return snapshot;
  try {
    const data: unknown = JSON.parse(value);
    if (
      !data ||
      typeof data !== "object" ||
      !("maps" in data) ||
      !("roster" in data)
    )
      return snapshot;
    if (!Array.isArray(data.maps) || !Array.isArray(data.roster))
      return snapshot;
    snapshot = {
      maps: data.maps.flatMap((row: unknown) =>
        row &&
        typeof row === "object" &&
        "mapSlug" in row &&
        typeof row.mapSlug === "string" &&
        isMapSlug(row.mapSlug) &&
        "hidden" in row &&
        typeof row.hidden === "boolean"
          ? [{ mapSlug: row.mapSlug, hidden: row.hidden }]
          : [],
      ),
      roster: data.roster.flatMap((row: unknown) =>
        row &&
        typeof row === "object" &&
        "mapSlug" in row &&
        typeof row.mapSlug === "string" &&
        isMapSlug(row.mapSlug) &&
        "agentSlug" in row &&
        typeof row.agentSlug === "string" &&
        isAgentSlug(row.agentSlug) &&
        "hidden" in row &&
        typeof row.hidden === "boolean"
          ? [
              {
                mapSlug: row.mapSlug,
                agentSlug: row.agentSlug,
                hidden: row.hidden,
                ...("viability" in row && getViabilityTier(row.viability)
                  ? { viability: getViabilityTier(row.viability)! }
                  : {}),
              },
            ]
          : [],
      ),
    };
  } catch {
    /* A damaged local preference starts with an empty selection. */
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useGuestSelection() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

function write(value: GuestSelection) {
  window.localStorage.setItem(KEY, JSON.stringify(value));
  for (const listener of listeners) listener();
}

export function setGuestMap(preference: MapPreference) {
  if (!isMapSlug(preference.mapSlug)) throw new Error("Choose a known map.");
  const current = read();
  write({
    ...current,
    maps: [
      ...current.maps.filter((row) => row.mapSlug !== preference.mapSlug),
      preference,
    ],
  });
}

export function setGuestAgent(preference: AgentPreference) {
  if (!isMapSlug(preference.mapSlug) || !isAgentSlug(preference.agentSlug))
    throw new Error("Choose a known map and agent.");
  const current = read();
  const existing = current.roster.find(
    (row) =>
      row.mapSlug === preference.mapSlug &&
      row.agentSlug === preference.agentSlug,
  );
  write({
    ...current,
    roster: [
      ...current.roster.filter((row) => row !== existing),
      { hidden: false, ...existing, ...preference },
    ],
  });
}
