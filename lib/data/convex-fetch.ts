import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex/server";
import { TAGS } from "@/lib/cache-tags";

export async function fetchEnabledMapSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.maps);
  try {
    const rows = await getConvexHttpClient().query(api.maps.listEnabled, {});
    return rows.map((m) => m.slug);
  } catch {
    // During local builds or if Convex is temporarily unavailable, fall back to all maps.
    return [];
  }
}

export async function fetchLineupsByMapAgent(
  mapSlug: string,
  agentSlug: string,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.screenshotsAll);
  cacheTag(TAGS.screenshots(mapSlug, agentSlug));
  try {
    return await getConvexHttpClient().query(api.lineups.listByMapAgent, {
      mapSlug,
      agentSlug,
    });
  } catch {
    return [];
  }
}

export async function fetchPublicLineupsFeed(limit = 50) {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.screenshotsAll);
  try {
    return await getConvexHttpClient().query(api.lineups.listPublicFeed, {
      limit,
    });
  } catch {
    return [];
  }
}

