import catalog from "../generated/valorant-catalog.json";
import { findMapRecord } from "../generated/valorant-maps";
import {
  isPlantSite,
  type LineupMetadata,
  type PlantSite,
} from "../lineups/metadata";

export type MapSlug = keyof typeof catalog.maps;
export type AgentSlug = keyof typeof catalog.agents;
export function isMapSlug(value: string): value is MapSlug {
  return Object.hasOwn(catalog.maps, value);
}
export function isAgentSlug(value: string): value is AgentSlug {
  return Object.hasOwn(catalog.agents, value);
}
export function getPlantSites(mapSlug: string): PlantSite[] {
  // Summit is present in the current game catalog but is not yet represented
  // in the legacy generated callout dataset used by the board.
  if (mapSlug === "summit") return ["A", "B"];
  return [
    ...new Set(
      findMapRecord(mapSlug)
        ?.callouts.filter((callout) => callout.regionName === "Site")
        .map((callout) => callout.superRegion)
        .filter(isPlantSite) ?? [],
    ),
  ].sort();
}
export function validateLineupSelection(
  mapSlug: string,
  agentSlug: string,
  metadata: LineupMetadata,
): void {
  if (!isMapSlug(mapSlug) || !isAgentSlug(agentSlug))
    throw new Error("Choose a known map and agent.");
  if (
    metadata.site !== "none" &&
    metadata.site !== "unspecified" &&
    !getPlantSites(mapSlug).includes(metadata.site)
  )
    throw new Error("This site does not exist on the selected map.");
  if (
    metadata.abilitySlot !== "unspecified" &&
    !catalog.agents[agentSlug].abilities.some(
      (ability) => ability.slot === metadata.abilitySlot,
    )
  )
    throw new Error("This ability does not belong to the selected agent.");
}
