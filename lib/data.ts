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

function conditionalCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  _keyParts: string[],
  _opts: { revalidate?: number; tags?: string[] },
): T {
  if (process.env.NODE_ENV === "development") {
    return fn;
  }
  return unstable_cache(fn, _keyParts, _opts) as T;
}

const getCachedValorantAssets = conditionalCache(
  async () => fetchValorantAssets(),
  ["valorant-assets"],
  { revalidate: 86400, tags: ["valorant-assets"] },
);

const getCachedMaps = conditionalCache(
  async () => client.fetch(mapsQuery),
  ["sanity-maps"],
  { revalidate: 3600, tags: ["sanity-maps"] },
);

const getCachedAgents = conditionalCache(
  async () => client.fetch(agentsQuery),
  ["sanity-agents"],
  { revalidate: 3600, tags: ["sanity-agents"] },
);

const getCachedAgentsByMap = conditionalCache(
  async (mapId: string) => client.fetch(agentsByMapQuery, { mapId }),
  ["sanity-agents-by-map"],
  { revalidate: 3600, tags: ["sanity-agents-by-map"] },
);

const getCachedScreenshots = conditionalCache(
  async (mapId: string, agentId: string) =>
    client.fetch(screenshotsByMapAndAgentQuery, { mapId, agentId }),
  ["sanity-screenshots"],
  { revalidate: 3600, tags: ["sanity-screenshots"] },
);

/** Get agent refs that have screenshots on a given map. */
const getCachedAgentRefsByMap = conditionalCache(
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
  const [allAgents, mapAgentsMeta, agentRefsWithScreenshots] = await Promise.all([
    getEnrichedAgents(),
    getCachedAgentsByMap(mapId),
    getCachedAgentRefsByMap(mapId),
  ]);

  // Build a set of agent IDs that are active on this map (either via mapAgentMeta or by having screenshots)
  const activeAgentIds = new Set<string>();
  
  // 1. Add agent IDs from mapAgentMeta
  const metaByAgentId = new Map<
    string,
    { viability: string | null; notes: string | null }
  >();
  for (const ma of mapAgentsMeta) {
    const id = ma.agent?._id ?? ma._id;
    if (id) {
      activeAgentIds.add(id);
      metaByAgentId.set(id, {
        viability: ma.viability ?? null,
        notes: ma.notes ?? null,
      });
    }
  }

  // 2. Add agent IDs from screenshots
  for (const ref of agentRefsWithScreenshots) {
    if (ref) {
      activeAgentIds.add(ref);
    }
  }

  // Only keep agents that are active on this map
  return allAgents
    .filter((agent) => activeAgentIds.has(agent._id))
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

/** Get list of maps that are in Valorant API but not in Sanity. */
export async function getUnaddedMaps(): Promise<ValorantMap[]> {
  const [sanityMaps, assets] = await Promise.all([
    getCachedMaps(),
    getCachedValorantAssets(),
  ]);
  const sanityMapNames = new Set(
    sanityMaps.map((m: any) =>
      (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
    ),
  );
  return Object.values(assets.maps).filter(
    (m) =>
      !sanityMapNames.has(
        (m.displayName || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
      ),
  );
}

/** Get all playable agents from Valorant API formatted as Agent objects. */
export async function getAllApiAgents(): Promise<Agent[]> {
  const assets = await getCachedValorantAssets();
  return Object.values(assets.agents).map((apiAgent) => ({
    _id: apiAgent.uuid,
    slug: {
      current: (apiAgent.displayName || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
    },
    name: apiAgent.displayName,
    roleName: apiAgent.role?.displayName || "",
    roleIcon: apiAgent.role?.displayIcon || null,
    imageUrl: apiAgent.fullPortrait || apiAgent.displayIcon || null,
    fullPortraitV2: apiAgent.fullPortraitV2 || null,
    bustPortrait: apiAgent.bustPortrait || null,
    displayIcon: apiAgent.displayIcon || null,
    background: apiAgent.background || null,
    backgroundGradientColors: apiAgent.backgroundGradientColors || [],
    description: apiAgent.description || null,
    abilities: (apiAgent.abilities || []).map((ab) => ({
      slot: ab.slot,
      displayName: ab.displayName,
      description: ab.description,
      displayIcon: ab.displayIcon || null,
    })),
  }));
}

/** Get list of agents that are in Valorant API but not in Sanity. */
export async function getUnaddedAgents(): Promise<ValorantAgent[]> {
  const [sanityAgents, assets] = await Promise.all([
    getCachedAgents(),
    getCachedValorantAssets(),
  ]);
  const sanityAgentNames = new Set(
    sanityAgents.map((a: any) =>
      (a.name || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
    ),
  );
  return Object.values(assets.agents).filter(
    (a) =>
      !sanityAgentNames.has(
        (a.displayName || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
      ),
  );
}

/** Get list of agents that are in Valorant API but not yet linked to the given map. */
export async function getUnaddedAgentsForMap(mapId: string): Promise<ValorantAgent[]> {
  const [mapAgentsMeta, agentRefsWithScreenshots, assets] = await Promise.all([
    getCachedAgentsByMap(mapId),
    getCachedAgentRefsByMap(mapId),
    getCachedValorantAssets(),
  ]);

  const presentAgentIds = new Set<string>();

  for (const ma of mapAgentsMeta) {
    const id = ma.agent?._id ?? ma._id;
    if (id) presentAgentIds.add(id);
  }

  for (const ref of agentRefsWithScreenshots) {
    if (ref) presentAgentIds.add(ref);
  }

  return Object.values(assets.agents).filter(
    (a) => !presentAgentIds.has(a.uuid)
  );
}



