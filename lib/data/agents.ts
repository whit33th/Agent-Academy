import { getAgentData } from "@/lib/valorant-api";
import type { ValorantAgent } from "@/lib/valorant-api";
import type { Agent, SanityAgent } from "@/lib/types";
import { normalizeName } from "@/lib/utils/normalize";
import {
  fetchAgents,
  fetchAgentRefsByMap,
  fetchAgentsByMap,
} from "./sanity-fetch";
import { getValorantAssets } from "./valorant-assets";
import { existsSync } from "node:fs";
import path from "node:path";

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
  const publicDir = path.join(process.cwd(), "public");
  for (const ext of [".png", ".jpg"]) {
    const filePath = path.join(publicDir, "imgs", "agents", `${slug}${ext}`);
    if (existsSync(filePath)) {
      return `/imgs/agents/${slug}${ext}`;
    }
  }
  return null;
}

function buildAgent(
  sanityAgent: SanityAgent,
  api: ValorantAgent | null,
): Agent {
  return {
    _id: sanityAgent._id,
    slug: sanityAgent.slug ?? null,
    name: api?.displayName ?? sanityAgent.name ?? "Unknown",
    roleName: api?.role?.displayName ?? sanityAgent.role ?? "",
    roleIcon: api?.role?.displayIcon ?? null,
    imageUrl: api?.fullPortrait ?? api?.displayIcon ?? null,
    fullPortraitV2: api?.fullPortraitV2 ?? null,
    bustPortrait: api?.bustPortrait ?? null,
    displayIcon: api?.displayIcon ?? null,
    background: api?.background ?? null,
    artBackground:
      localDarkBackground(api?.displayName ?? sanityAgent.name ?? "") ?? null,
    backgroundGradientColors: api?.backgroundGradientColors ?? [],
    description: api?.description ?? null,
    abilities: (api?.abilities ?? []).map((ab) => ({
      slot: ab.slot,
      displayName: ab.displayName,
      description: ab.description,
      displayIcon: ab.displayIcon ?? null,
    })),
    accentColor: sanityAgent.accentColor ?? null,
    voiceLineUrl:
      api?.voiceLine?.mediaList?.[0]?.wave ??
      localVoiceLineUrl(api?.displayName ?? sanityAgent.name),
  };
}

/** All Sanity agents enriched with Valorant API data. */
export async function getEnrichedAgents(): Promise<Agent[]> {
  const [agents, assets] = await Promise.all([
    fetchAgents(),
    getValorantAssets(),
  ]);
  return agents.map((s) =>
    buildAgent(s, getAgentData(assets.agents, s.name ?? "")),
  );
}

/** Agents active on a given map (have meta or screenshots). */
export async function getAgentsForMap(mapId: string): Promise<Agent[]> {
  const [allAgents, mapMeta, refsWithScreenshots] = await Promise.all([
    getEnrichedAgents(),
    fetchAgentsByMap(mapId),
    fetchAgentRefsByMap(mapId),
  ]);

  const activeIds = new Set<string>();
  const metaByAgentId = new Map<
    string,
    { viability: string | null; notes: string | null }
  >();

  for (const ma of mapMeta) {
    const id = ma.agent?._id ?? ma._id;
    if (!id) continue;
    activeIds.add(id);
    metaByAgentId.set(id, {
      viability: ma.viability ?? null,
      notes: ma.notes ?? null,
    });
  }
  for (const ref of refsWithScreenshots) {
    if (ref) activeIds.add(ref);
  }

  return allAgents
    .filter((a) => activeIds.has(a._id))
    .map((a) => {
      const meta = metaByAgentId.get(a._id);
      return {
        ...a,
        viability: meta?.viability ?? null,
        notes: meta?.notes ?? null,
      };
    });
}

/** All Valorant API agents formatted as Agent objects (no Sanity dependency). */
export async function getAllApiAgents(): Promise<Agent[]> {
  const assets = await getValorantAssets();
  return Object.values(assets.agents).map((api) => ({
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
    artBackground: localDarkBackground(api.displayName) ?? null,
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
  }));
}

/** API agents not yet in Sanity. */
export async function getUnaddedAgents(): Promise<ValorantAgent[]> {
  const [sanityAgents, assets] = await Promise.all([
    fetchAgents(),
    getValorantAssets(),
  ]);
  const taken = new Set(sanityAgents.map((a) => normalizeName(a.name)));
  return Object.values(assets.agents).filter(
    (a) => !taken.has(normalizeName(a.displayName)),
  );
}

/** Find a single enriched agent by slug or id. */
export async function findAgent(slugOrId: string): Promise<Agent | null> {
  const agents = await getEnrichedAgents();
  return (
    agents.find((a) => a.slug?.current === slugOrId || a._id === slugOrId) ??
    null
  );
}

/** API agents not yet linked to the given map. */
export async function getUnaddedAgentsForMap(
  mapId: string,
): Promise<ValorantAgent[]> {
  const [mapMeta, refsWithScreenshots, assets] = await Promise.all([
    fetchAgentsByMap(mapId),
    fetchAgentRefsByMap(mapId),
    getValorantAssets(),
  ]);

  const present = new Set<string>();
  for (const ma of mapMeta) {
    const id = ma.agent?._id ?? ma._id;
    if (id) present.add(id);
  }
  for (const ref of refsWithScreenshots) {
    if (ref) present.add(ref);
  }

  return Object.values(assets.agents).filter((a) => !present.has(a.uuid));
}
