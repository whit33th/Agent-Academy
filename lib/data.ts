import { unstable_cache } from "next/cache";
import { client } from "./sanity";
import {
  mapsQuery,
  agentsQuery,
  agentsByMapQuery,
  screenshotsByMapAndAgentQuery,
  agentRefsByMapQuery,
} from "./queries";
import { fetchValorantAssets, getAgentData, getMapData } from "./valorant-api";
import type { ValorantAgent, ValorantMap } from "./valorant-api";
import type {
  Agent,
  GameMap,
  Screenshot,
  SanityAgent,
  SanityMap,
} from "./types";

/**
 * Central data-access layer.
 * Every function is cached with unstable_cache for ISR.
 */

const getCachedValorantAssets = unstable_cache(
  async () => fetchValorantAssets(),
  ["valorant-assets"],
  { revalidate: 86400, tags: ["valorant-assets"] },
);

const getCachedMaps = unstable_cache(
  async () => client.fetch(mapsQuery),
  ["sanity-maps"],
  { revalidate: 3600, tags: ["sanity-maps"] },
);

const getCachedAgents = unstable_cache(
  async () => client.fetch(agentsQuery),
  ["sanity-agents"],
  { revalidate: 3600, tags: ["sanity-agents"] },
);

const getCachedAgentsByMap = unstable_cache(
  async (mapId: string) => client.fetch(agentsByMapQuery, { mapId }),
  ["sanity-agents-by-map"],
  { revalidate: 3600, tags: ["sanity-agents-by-map"] },
);

const getCachedScreenshots = unstable_cache(
  async (mapId: string, agentId: string) =>
    client.fetch(screenshotsByMapAndAgentQuery, { mapId, agentId }),
  ["sanity-screenshots"],
  { revalidate: 3600, tags: ["sanity-screenshots"] },
);

/** Get agent refs that have screenshots on a given map. */
const getCachedAgentRefsByMap = unstable_cache(
  async (mapId: string) =>
    client.fetch<string[]>(agentRefsByMapQuery, { mapId }),
  ["sanity-agent-refs-by-map"],
  { revalidate: 3600, tags: ["sanity-agent-refs-by-map"] },
);

function enrichAgent(
  sanityAgent: SanityAgent,
  apiAgent: ValorantAgent | null,
): Agent {
  return {
    _id: sanityAgent._id,
    slug: sanityAgent.slug ?? null,
    name: apiAgent?.displayName ?? sanityAgent.name ?? "Unknown",
    roleName: apiAgent?.role?.displayName ?? sanityAgent.role ?? "",
    roleIcon: apiAgent?.role?.displayIcon ?? null,
    imageUrl: apiAgent?.fullPortrait || apiAgent?.displayIcon || null,
    fullPortraitV2: apiAgent?.fullPortraitV2 ?? null,
    bustPortrait: apiAgent?.bustPortrait ?? null,
    displayIcon: apiAgent?.displayIcon ?? null,
    background: apiAgent?.background ?? null,
    backgroundGradientColors: apiAgent?.backgroundGradientColors ?? [],
    description: apiAgent?.description ?? null,
    abilities: (apiAgent?.abilities ?? []).map((ab) => ({
      slot: ab.slot,
      displayName: ab.displayName,
      description: ab.description,
      displayIcon: ab.displayIcon ?? null,
    })),
    accentColor: sanityAgent.accentColor ?? null,
  };
}

/** Enrich Sanity agents with Valorant API asset data. */
export async function getEnrichedAgents(): Promise<Agent[]> {
  const [agents, valorantAssets] = await Promise.all([
    getCachedAgents(),
    getCachedValorantAssets(),
  ]);

  return agents.map((sanityAgent: SanityAgent) => {
    const apiData = getAgentData(valorantAssets.agents, sanityAgent.name || "");
    return enrichAgent(sanityAgent, apiData);
  });
}

/** Enrich Sanity maps with Valorant API asset data. */
export async function getEnrichedMaps(): Promise<GameMap[]> {
  const [maps, valorantAssets] = await Promise.all([
    getCachedMaps(),
    getCachedValorantAssets(),
  ]);

  return maps.map((sanityMap: SanityMap) => {
    const apiData = getMapData(valorantAssets.maps, sanityMap.name || "");
    return {
      _id: sanityMap._id,
      slug: sanityMap.slug ?? null,
      name: apiData?.displayName ?? sanityMap.name ?? "Unknown",
      imageUrl: apiData?.splash || apiData?.listViewIconTall || null,
      listViewIcon: apiData?.listViewIcon ?? null,
      stylizedBackgroundImage: apiData?.stylizedBackgroundImage ?? null,
      accentColor: sanityMap.accentColor ?? null,
    };
  });
}

/**
 * Returns agents that have at least one screenshot for the given map.
 * Name/role always come from Valorant API.
 * Optional viability from mapAgentMeta is merged in.
 */
export async function getAgentsForMap(mapId: string): Promise<Agent[]> {
  const [allAgents, agentRefs, mapAgentsMeta] = await Promise.all([
    getEnrichedAgents(),
    getCachedAgentRefsByMap(mapId),
    getCachedAgentsByMap(mapId),
  ]);

  const uniqueAgentRefs = new Set(agentRefs);

  // Build a quick lookup for viability from mapAgentMeta
  const metaByAgentId = new Map<
    string,
    { viability: string | null; notes: string | null }
  >();
  for (const ma of mapAgentsMeta) {
    const id = ma.agent?._id ?? ma._id;
    metaByAgentId.set(id, {
      viability: ma.viability ?? null,
      notes: ma.notes ?? null,
    });
  }

  // Only keep agents that actually have screenshots on this map
  return allAgents
    .filter((agent) => uniqueAgentRefs.has(agent._id))
    .map((agent) => {
      const meta = metaByAgentId.get(agent._id);
      return {
        ...agent,
        viability: meta?.viability ?? null,
        notes: meta?.notes ?? null,
      };
    });
}

/** Get screenshots for a map+agent combo. */
export async function getScreenshots(
  mapId: string,
  agentId: string,
): Promise<Screenshot[]> {
  return getCachedScreenshots(mapId, agentId);
}
