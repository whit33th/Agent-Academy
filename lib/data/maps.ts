import type { ValorantMap } from "@/lib/valorant-api";
import type { GameMap } from "@/lib/types";
import { normalizeName } from "@/lib/utils/normalize";
import { getValorantAssets } from "./valorant-assets";
import { fetchEnabledMapSlugs } from "./convex-fetch";

function buildMap(api: ValorantMap): GameMap {
  const slug = normalizeName(api.displayName);
  return {
    _id: slug,
    slug: { current: slug },
    name: api.displayName,
    imageUrl: api.splash ?? api.listViewIconTall ?? null,
    listViewIcon: api.listViewIcon ?? null,
    displayIcon: api.displayIcon ?? null,
    stylizedBackgroundImage: api.stylizedBackgroundImage ?? null,
  };
}

/** All maps from Valorant API, optionally filtered by Convex enabled list. */
export async function getEnrichedMaps(): Promise<GameMap[]> {
  const [assets, enabled] = await Promise.all([
    getValorantAssets(),
    fetchEnabledMapSlugs().catch(() => [] as string[]),
  ]);

  const all = Object.values(assets.maps)
    .filter((m) => m.displayName)
    .map((m) => buildMap(m));

  if (enabled.length === 0) return all;
  const enabledSet = new Set(enabled);
  return all.filter((m) => enabledSet.has(m.slug?.current ?? m._id));
}

/** Maps in Valorant API that are not enabled yet. */
export async function getUnaddedMaps(): Promise<ValorantMap[]> {
  const [assets, enabled] = await Promise.all([
    getValorantAssets(),
    fetchEnabledMapSlugs().catch(() => [] as string[]),
  ]);
  const enabledSet = new Set(enabled);
  return Object.values(assets.maps).filter(
    (m) => !enabledSet.has(normalizeName(m.displayName)),
  );
}

/** Find a map by its slug or id. */
export async function findMap(slugOrId: string): Promise<GameMap | null> {
  const assets = await getValorantAssets();
  const map = assets.maps[slugOrId];
  return map ? buildMap(map) : null;
}
