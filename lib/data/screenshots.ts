import type { Screenshot } from "@/lib/types";
import { fetchScreenshots } from "./sanity-fetch";

/** Screenshots for a map+agent combo. */
export async function getScreenshots(
  mapId: string,
  agentId: string,
): Promise<Screenshot[]> {
  return fetchScreenshots(mapId, agentId);
}
