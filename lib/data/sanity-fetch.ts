import { cacheLife, cacheTag } from "next/cache";
import { client } from "@/lib/sanity";
import {
  mapsQuery,
  agentsQuery,
  agentsByMapQuery,
  agentRefsByMapQuery,
  screenshotsByMapAndAgentQuery,
  screenshotCountsByMapQuery,
} from "@/lib/queries";
import { TAGS } from "@/lib/cache-tags";
import type {
  SanityAgent,
  SanityMap,
  SanityMapAgentMeta,
  Screenshot,
} from "@/lib/types";

export async function fetchMaps(): Promise<SanityMap[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.maps);
  return client.fetch<SanityMap[]>(mapsQuery);
}

export async function fetchAgents(): Promise<SanityAgent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.agents);
  return client.fetch<SanityAgent[]>(agentsQuery);
}

export async function fetchAgentsByMap(
  mapId: string,
): Promise<SanityMapAgentMeta[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.agentsByMap(mapId));
  return client.fetch<SanityMapAgentMeta[]>(agentsByMapQuery, { mapId });
}

export async function fetchAgentRefsByMap(mapId: string): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.agentRefsByMap(mapId));
  return client.fetch<string[]>(agentRefsByMapQuery, { mapId });
}

export async function fetchScreenshots(
  mapId: string,
  agentId: string,
): Promise<Screenshot[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.screenshots(mapId, agentId));
  cacheTag(TAGS.screenshotsAll);
  return client.fetch<Screenshot[]>(screenshotsByMapAndAgentQuery, {
    mapId,
    agentId,
  });
}

interface ScreenshotAgentRow {
  agentId: string;
}

export async function fetchScreenshotCountsByMap(
  mapId: string,
): Promise<Record<string, number>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.screenshotsAll);
  cacheTag(TAGS.agentsByMap(mapId));

  const rows = await client.fetch<ScreenshotAgentRow[]>(
    screenshotCountsByMapQuery,
    { mapId },
  );

  const out: Record<string, number> = {};
  for (const row of rows) {
    if (row.agentId) out[row.agentId] = (out[row.agentId] ?? 0) + 1;
  }
  return out;
}
