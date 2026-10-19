import type { ValorantAgent } from "@/lib/valorant-api";
import type { Agent } from "@/lib/types";
import { normalizeName } from "@/lib/utils/normalize";
import { getValorantAssets } from "./valorant-assets";
import { readdirSync } from "node:fs";
import path from "node:path";

const wallpapers = new Map<string, string>();
let wallpapersRead = false;

function readWallpapers() {
  if (wallpapersRead) return;
  wallpapersRead = true;
  const dir = path.join(process.cwd(), "public", "imgs", "agents");
  try {
    for (const file of readdirSync(dir).sort()) {
      const match = /^(.+)\.(png|jpg)$/i.exec(file);
      if (match) wallpapers.set(match[1], `/imgs/agents/${file}`);
    }
  } catch {
    // No local wallpapers in this environment.
  }
}

function localVoiceLineUrl(
  agentName: string | null | undefined,
): string | null {
  if (!agentName) return null;
  const slug = normalizeName(agentName);
  return slug ? `/sounds/agents/${slug}.mp3` : null;
}

/** Prefer locally-downloaded dark wallpaper from playvalorant.com. */
function localDarkBackground(agentName: string): string | null {
  if (!agentName) return null;
  const slug = normalizeName(agentName);
  if (!slug) return null;
  readWallpapers();
  return wallpapers.get(slug) ?? null;
}

function buildAgent(api: ValorantAgent): Agent {
  return {
    _id: api.uuid,
    slug: { current: normalizeName(api.displayName) },
    name: api.displayName,
    roleName: api.role?.displayName ?? "",
    roleIcon: api.role?.displayIcon ?? null,
    imageUrl: api.fullPortrait ?? api.displayIcon ?? null,
    fullPortraitV2: api.fullPortraitV2 ?? null,
    bustPortrait: api.bustPortrait ?? null,
    displayIcon: api.displayIcon ?? null,
    background: api.background ?? null,
    artBackground:
      localDarkBackground(api.displayName) ?? null,
    backgroundGradientColors: api.backgroundGradientColors ?? [],
    description: api.description ?? null,
    abilities: (api.abilities ?? []).map((ab) => ({
      slot: ab.slot,
      displayName: ab.displayName,
      description: ab.description,
      displayIcon: ab.displayIcon ?? null,
    })),
    voiceLineUrl:
      api.voiceLine?.mediaList?.[0]?.wave ?? localVoiceLineUrl(api.displayName),
  };
}

/** All agents from Valorant API formatted as Agent objects. */
export async function getEnrichedAgents(): Promise<Agent[]> {
  const assets = await getValorantAssets();
  return Object.values(assets.agents).map((api) => buildAgent(api));
}

/** Agents active on a given map (have meta or screenshots). */
export async function getAgentsForMap(mapId: string): Promise<Agent[]> {
  // Convex will provide per-user roster + viability. For now, keep map pages usable
  // by returning the full roster until the read-layer is wired to Convex roster.
  void mapId;
  return getEnrichedAgents();
}

/** All Valorant API agents formatted as Agent objects (no Sanity dependency). */
export async function getAllApiAgents(): Promise<Agent[]> {
  return getEnrichedAgents();
}

export async function getAgentCount(): Promise<number> {
  return Object.keys((await getValorantAssets()).agents).length;
}

/** API agents not yet in Sanity. */
export async function getUnaddedAgents(): Promise<ValorantAgent[]> {
  // With Convex we don't maintain a separate CMS list of agents.
  return [];
}

/** Find a single enriched agent by slug or id. */
export async function findAgent(slugOrId: string): Promise<Agent | null> {
  const assets = await getValorantAssets();
  const api = Object.values(assets.agents).find(
    (agent) => agent.uuid === slugOrId || normalizeName(agent.displayName) === slugOrId,
  );
  return api ? buildAgent(api) : null;
}

/** API agents not yet linked to the given map. */
export async function getUnaddedAgentsForMap(
  mapId: string,
): Promise<ValorantAgent[]> {
  void mapId;
  return Object.values((await getValorantAssets()).agents);
}
