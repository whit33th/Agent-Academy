/**
 * Centralized cache tag constants used by the data layer and Server Actions.
 * Tags must match between fetchers (`cacheTag`) and revalidators (`revalidateTag`).
 */
export const TAGS = {
  valorantAssets: "valorant-assets",
  maps: "sanity-maps",
  agents: "sanity-agents",
  agentsByMap: (mapId: string) => `sanity-agents-by-map:${mapId}`,
  agentRefsByMap: (mapId: string) => `sanity-agent-refs-by-map:${mapId}`,
  screenshots: (mapId: string, agentId: string) =>
    `sanity-screenshots:${mapId}:${agentId}`,
  screenshotsAll: "sanity-screenshots-all",
} as const;

export type CacheTag = string;
