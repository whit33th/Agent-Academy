import { getMapData } from "@/lib/valorant-api";
import type { ValorantMap } from "@/lib/valorant-api";
import type { GameMap, SanityMap } from "@/lib/types";
import { normalizeName } from "@/lib/utils/normalize";
import { fetchMaps } from "./sanity-fetch";
import { getValorantAssets } from "./valorant-assets";

function buildMap(sanityMap: SanityMap, api: ValorantMap | null): GameMap {
  return {
    _id: sanityMap._id,
    slug: sanityMap.slug ?? null,
    name: api?.displayName ?? sanityMap.name ?? "Unknown",
    imageUrl: api?.splash ?? api?.listViewIconTall ?? null,
    listViewIcon: api?.listViewIcon ?? null,
    displayIcon: api?.displayIcon ?? null,
    stylizedBackgroundImage: api?.stylizedBackgroundImage ?? null,
    accentColor: sanityMap.accentColor ?? null,
  };
}

/** All Sanity maps enriched with Valorant API data. */
export async function getEnrichedMaps(): Promise<GameMap[]> {
  const [maps, assets] = await Promise.all([fetchMaps(), getValorantAssets()]);
  return maps.map((s) => buildMap(s, getMapData(assets.maps, s.name ?? "")));
}

/** Maps in Valorant API but not in Sanity. */
export async function getUnaddedMaps(): Promise<ValorantMap[]> {
  const [sanityMaps, assets] = await Promise.all([fetchMaps(), getValorantAssets()]);
  const taken = new Set(sanityMaps.map((m) => normalizeName(m.name)));
  return Object.values(assets.maps).filter((m) => !taken.has(normalizeName(m.displayName)));
}

/** Find a map by its slug or id. */
export async function findMap(slugOrId: string): Promise<GameMap | null> {
  const maps = await getEnrichedMaps();
  return maps.find((m) => m.slug?.current === slugOrId || m._id === slugOrId) ?? null;
}
