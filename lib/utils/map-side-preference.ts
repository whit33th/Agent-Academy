import type { SideKey } from "@/components/lineups/SideTabs";

const listeners = new Set<() => void>();

function storageKey(mapId: string): string {
  return `vp_side_${mapId}`;
}

export function subscribeMapSide(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getStoredMapSide(mapId: string): SideKey | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(storageKey(mapId));
  if (v === "all" || v === "atk" || v === "def") return v;
  return null;
}

export function setStoredMapSide(mapId: string, side: SideKey): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(mapId), side);
  for (const listener of listeners) listener();
}
