import type { SideKey } from "@/components/lineups/SideTabs";

function storageKey(mapId: string): string {
  return `vp_side_${mapId}`;
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
}
