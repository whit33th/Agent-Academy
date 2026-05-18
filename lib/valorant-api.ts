const AGENTS_API =
  "https://valorant-api.com/v1/agents?isPlayableCharacter=true";
const MAPS_API = "https://valorant-api.com/v1/maps";

export interface ValorantAgentRole {
  uuid: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
  assetPath: string;
}

export interface ValorantAgentAbility {
  slot: string;
  displayName: string;
  description: string;
  displayIcon: string | null;
}

export interface ValorantAgentVoiceLineMedia {
  id: number;
  wwise: string;
  wave: string;
}

export interface ValorantAgentVoiceLine {
  minDuration: number;
  maxDuration: number;
  mediaList: ValorantAgentVoiceLineMedia[];
}

export interface ValorantAgentRecruitmentData {
  counterId: string;
  milestoneId: string;
  milestoneIndex: number;
  useLevelVpCost: number;
  startDate: string;
  endDate: string;
}

export interface ValorantAgent {
  uuid: string;
  displayName: string;
  description: string;
  developerName: string;
  releaseDate: string;
  characterTags: string[] | null;
  displayIcon: string | null;
  displayIconSmall: string | null;
  bustPortrait: string | null;
  fullPortrait: string | null;
  fullPortraitV2: string | null;
  killfeedPortrait: string | null;
  minimapPortrait: string | null;
  homeScreenPromoTileImage: string | null;
  background: string | null;
  backgroundGradientColors: string[];
  assetPath: string;
  isFullPortraitRightFacing: boolean;
  isPlayableCharacter: boolean;
  isAvailableForTest: boolean;
  isBaseContent: boolean;
  role: ValorantAgentRole | null;
  recruitmentData: ValorantAgentRecruitmentData | null;
  abilities: ValorantAgentAbility[];
  voiceLine: ValorantAgentVoiceLine | null;
}

export interface ValorantMap {
  uuid: string;
  displayName: string;
  splash: string | null;
  listViewIcon: string | null;
  listViewIconTall: string | null;
  stylizedBackgroundImage: string | null;
}

export async function fetchValorantAssets() {
  const [agentsRes, mapsRes] = await Promise.all([
    fetch(AGENTS_API, { next: { revalidate: 86400 } }),
    fetch(MAPS_API, { next: { revalidate: 86400 } }),
  ]);

  if (!agentsRes.ok || !mapsRes.ok) {
    throw new Error("Failed to fetch Valorant API assets");
  }

  const [agentsData, mapsData] = await Promise.all([
    agentsRes.json(),
    mapsRes.json(),
  ]);

  const agents: Record<string, ValorantAgent> = {};
  const maps: Record<string, ValorantMap> = {};

  for (const agent of agentsData.data) {
    agents[normalizeName(agent.displayName)] = {
      uuid: agent.uuid,
      displayName: agent.displayName,
      description: agent.description,
      developerName: agent.developerName,
      releaseDate: agent.releaseDate,
      characterTags: agent.characterTags || null,
      displayIcon: agent.displayIcon,
      displayIconSmall: agent.displayIconSmall,
      bustPortrait: agent.bustPortrait,
      fullPortrait: agent.fullPortrait,
      fullPortraitV2: agent.fullPortraitV2,
      killfeedPortrait: agent.killfeedPortrait,
      minimapPortrait: agent.minimapPortrait,
      homeScreenPromoTileImage: agent.homeScreenPromoTileImage,
      background: agent.background,
      backgroundGradientColors: agent.backgroundGradientColors || [],
      assetPath: agent.assetPath,
      isFullPortraitRightFacing: agent.isFullPortraitRightFacing,
      isPlayableCharacter: agent.isPlayableCharacter,
      isAvailableForTest: agent.isAvailableForTest,
      isBaseContent: agent.isBaseContent,
      role: agent.role
        ? {
            uuid: agent.role.uuid,
            displayName: agent.role.displayName,
            description: agent.role.description,
            displayIcon: agent.role.displayIcon,
            assetPath: agent.role.assetPath,
          }
        : null,
      recruitmentData: agent.recruitmentData
        ? {
            counterId: agent.recruitmentData.counterId,
            milestoneId: agent.recruitmentData.milestoneId,
            milestoneIndex: agent.recruitmentData.milestoneIndex,
            useLevelVpCost: agent.recruitmentData.useLevelVpCost,
            startDate: agent.recruitmentData.startDate,
            endDate: agent.recruitmentData.endDate,
          }
        : null,
      abilities: (agent.abilities || []).map((ab: ValorantAgentAbility) => ({
        slot: ab.slot,
        displayName: ab.displayName,
        description: ab.description,
        displayIcon: ab.displayIcon,
      })),
      voiceLine: agent.voiceLine
        ? {
            minDuration: agent.voiceLine.minDuration,
            maxDuration: agent.voiceLine.maxDuration,
            mediaList: (agent.voiceLine.mediaList || []).map((m: ValorantAgentVoiceLineMedia) => ({
              id: m.id,
              wwise: m.wwise,
              wave: m.wave,
            })),
          }
        : null,
    };
  }

  for (const map of mapsData.data) {
    if (
      map.displayName === "The Range" ||
      map.displayName === "Basic Training" ||
      map.displayName.startsWith("Skirmish")
    ) {
      continue;
    }
    maps[normalizeName(map.displayName)] = {
      uuid: map.uuid,
      displayName: map.displayName,
      splash: map.splash,
      listViewIcon: map.listViewIcon,
      listViewIconTall: map.listViewIconTall,
      stylizedBackgroundImage: map.stylizedBackgroundImage,
    };
  }

  return { agents, maps };
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getAgentImageUrl(
  agents: Record<string, ValorantAgent>,
  name: string,
): string | null {
  const normalized = normalizeName(name);

  if (agents[normalized]) {
    return agents[normalized].fullPortrait || agents[normalized].displayIcon;
  }

  for (const [apiName, agent] of Object.entries(agents)) {
    if (apiName.includes(normalized) || normalized.includes(apiName)) {
      return agent.fullPortrait || agent.displayIcon;
    }
  }

  return null;
}

export function getAgentData(
  agents: Record<string, ValorantAgent>,
  name: string,
): ValorantAgent | null {
  const normalized = normalizeName(name);

  if (agents[normalized]) {
    return agents[normalized];
  }

  for (const [apiName, agent] of Object.entries(agents)) {
    if (apiName.includes(normalized) || normalized.includes(apiName)) {
      return agent;
    }
  }

  return null;
}

export function getMapImageUrl(
  maps: Record<string, ValorantMap>,
  name: string,
): string | null {
  const normalized = normalizeName(name);

  if (maps[normalized]) {
    return maps[normalized].splash || maps[normalized].listViewIconTall;
  }

  for (const [apiName, map] of Object.entries(maps)) {
    if (apiName.includes(normalized) || normalized.includes(apiName)) {
      return map.splash || map.listViewIconTall;
    }
  }

  return null;
}

export function getMapData(
  maps: Record<string, ValorantMap>,
  name: string,
): ValorantMap | null {
  const normalized = normalizeName(name);

  if (maps[normalized]) {
    return maps[normalized];
  }

  for (const [apiName, map] of Object.entries(maps)) {
    if (apiName.includes(normalized) || normalized.includes(apiName)) {
      return map;
    }
  }

  return null;
}
