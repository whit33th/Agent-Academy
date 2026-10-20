const STORAGE_KEY = "vp_favorite_setups";

const listeners = new Set<() => void>();
let cached = "";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function getFavoriteSetupIds(): Set<string> {
  return new Set(readIds());
}

export function subscribeFavoriteSetups(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getFavoriteSetupsSnapshot(): string {
  const next = readIds().slice().sort().join("\n");
  if (next === cached) return cached;
  cached = next;
  return cached;
}

export function getFavoriteSetupsServerSnapshot() {
  return "";
}

function publishFavorites(ids: Iterable<string>) {
  cached = [...ids].sort().join("\n");
  for (const listener of listeners) listener();
}

/** Returns true if the setup is now favorited. */
export function toggleFavoriteSetup(id: string): boolean {
  const set = getFavoriteSetupIds();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  publishFavorites(set);
  return set.has(id);
}
