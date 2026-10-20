import snapshot from "@/lib/generated/valorant-catalog.json";
import type { Agent, GameMap } from "@/lib/types";
import { normalizeName } from "@/lib/utils/normalize";
import { isAbilitySlot } from "@/lib/lineups/metadata";

export const catalogVersion = snapshot.gameVersion;
const maps: GameMap[] = Object.entries(snapshot.maps).map(([slug, map]) => ({
  _id: slug,
  slug: { current: slug },
  name: map.displayName,
  imageUrl: map.splash,
  displayIcon: map.displayIcon,
}));
const agents: Agent[] = Object.entries(snapshot.agents)
  .map(([slug, agent]) => ({
    _id: agent.uuid,
    slug: { current: slug },
    name: agent.displayName,
    roleName: agent.role.displayName,
    roleIcon: agent.role.displayIcon,
    imageUrl: agent.fullPortrait,
    displayIcon: agent.displayIcon,
    background: agent.background,
    artBackground: agent.artBackground,
    backgroundGradientColors: agent.backgroundGradientColors,
    description: agent.description,
    abilities: agent.abilities.map((ability) => {
      if (!isAbilitySlot(ability.slot))
        throw new Error("Unsupported catalog ability slot");
      return { ...ability, slot: ability.slot };
    }),
    voiceLineUrl: `/sounds/agents/${slug}.mp3`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

export function getMaps(): GameMap[] {
  return maps;
}
export function getAgents(): Agent[] {
  return agents;
}
export function findMap(slugOrId: string): GameMap | null {
  const slug = normalizeName(slugOrId);
  return (
    maps.find(
      (map) =>
        map._id === slug ||
        snapshot.maps[map._id as keyof typeof snapshot.maps].uuid === slugOrId,
    ) ?? null
  );
}
export function findAgent(slugOrId: string): Agent | null {
  const slug = normalizeName(slugOrId);
  return (
    agents.find(
      (agent) => agent._id === slugOrId || agent.slug?.current === slug,
    ) ?? null
  );
}
