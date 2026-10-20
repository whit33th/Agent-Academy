import { isSideFilter, type SideFilter } from "@/lib/lineups/metadata";

const listeners = new Set<() => void>();

function storageKey(mapId: string): string {
  return `vp_side_${mapId}`;
}

export function subscribeMapSide(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getStoredMapSide(mapId: string): SideFilter | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(storageKey(mapId));
  if (isSideFilter(v)) return v;
  return null;
}

export function setStoredMapSide(mapId: string, side: SideFilter): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(mapId), side);
  for (const listener of listeners) listener();
}
