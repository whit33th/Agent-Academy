import { cacheLife, cacheTag } from "next/cache";
import type { Screenshot } from "@/lib/types";
import { fetchLineupsByMapAgent } from "./convex-fetch";
import { getConvexHttpClient } from "@/lib/convex/server";
import { api } from "@/convex/_generated/api";
import { TAGS } from "@/lib/cache-tags";

/** Screenshots for a map+agent combo. */
export async function getScreenshots(
  mapId: string,
  agentId: string,
): Promise<Screenshot[]> {
  // During Convex transition, mapId/agentId are slugs (see lib/data/maps.ts + agents.ts).
  const rows = await fetchLineupsByMapAgent(mapId, agentId);
  return rows.map((r) => ({
    _id: String(r._id),
    title: r.title ?? "",
    description: r.description ?? null,
    abilityType: r.abilityType ?? null,
    image: r.imageUrl ?? null,
    isPublic: Boolean(r.isPublic),
    canEdit: false,
    map: null,
    agent: null,
  }));
}

/** Number of setups per agent on a map (agentId → count). */
export async function getScreenshotCountsByMap(
  mapId: string,
): Promise<Record<string, number>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.screenshotsAll);
  cacheTag(TAGS.screenshots(mapId, "counts"));
  try { return await getConvexHttpClient().query(api.lineups.countsByMap, { mapSlug: mapId }); }
  catch { return {}; }
}

export interface MapLineupProgress {
  /** Agents on this map that have at least one lineup. */
  agentsWithLineups: number;
  countsByAgent: Record<string, number>;
}

export async function getMapLineupProgress(
  mapId: string,
): Promise<MapLineupProgress> {
  const countsByAgent = await getScreenshotCountsByMap(mapId);
  const agentsWithLineups = Object.keys(countsByAgent).length;

  return {
    agentsWithLineups,
    countsByAgent,
  };
}
