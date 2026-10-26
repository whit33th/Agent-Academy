import data from "@/lib/generated/board-data.json";
import type {
  AbilityDefinition,
  ActiveAbilitySlot,
  BoardDocumentV2,
  MapCalibration,
} from "./types";

export const boardDataVersion = data.dataVersion;
export const boardGameBuild = data.gameBuild;
export const boardManifestId = data.manifestId;
export const boardMaps: readonly MapCalibration[] = data.maps.map((map) => {
  if (map.worldToRadar.length !== 6)
    throw new Error(`Invalid radar projection: ${map.mapId}`);
  const [a, b, c, d, tx, ty] = map.worldToRadar;
  return { ...map, worldToRadar: [a, b, c, d, tx, ty] };
});
export const abilityDefinitions =
  data.abilities as unknown as readonly AbilityDefinition[];
const mapsById = new Map(boardMaps.map((map) => [map.mapId, map]));
const definitionsById = new Map(
  abilityDefinitions.map((definition) => [definition.id, definition]),
);

export function getMapCalibration(mapId: string): MapCalibration | undefined {
  return mapsById.get(mapId.toLowerCase());
}

export function getAbilityDefinition(id: string): AbilityDefinition {
  const definition = definitionsById.get(id);
  if (!definition) throw new Error(`Unsupported board ability: ${id}`);
  return definition;
}

export function findAbilityDefinition(
  agentId: string,
  slot: ActiveAbilitySlot,
): AbilityDefinition | undefined {
  return definitionsById.get(`${agentId}:${slot}`);
}

export function emptyBoard(mapId: string): BoardDocumentV2 {
  if (!getMapCalibration(mapId))
    throw new Error("Board is available on standard maps only.");
  return {
    version: 2,
    mapId,
    gameBuild: boardGameBuild,
    dataVersion: boardDataVersion,
    objects: [],
  };
}
