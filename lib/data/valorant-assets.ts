import { cacheLife, cacheTag } from "next/cache";
import { fetchValorantAssets } from "@/lib/valorant-api";
import { TAGS } from "@/lib/cache-tags";

/** Cached Valorant API assets (agents + maps). */
export async function getValorantAssets() {
  "use cache";
  cacheLife("days");
  cacheTag(TAGS.valorantAssets);
  return fetchValorantAssets();
}
