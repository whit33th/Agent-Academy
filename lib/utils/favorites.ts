const STORAGE_KEY = "vp_favorite_setups";

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

export function getFavoriteSetupIds(): Set<string> {
  return new Set(readIds());
}

export function isFavoriteSetup(id: string): boolean {
  return getFavoriteSetupIds().has(id);
}

/** Returns true if the setup is now favorited. */
export function toggleFavoriteSetup(id: string): boolean {
  const set = getFavoriteSetupIds();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  return set.has(id);
}
