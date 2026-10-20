export interface MapPreference {
  mapSlug: string;
  hidden: boolean;
}

export interface AgentPreference {
  mapSlug: string;
  agentSlug: string;
  hidden?: boolean;
  notes?: string;
  viability?: string;
}

export function selectedMapSlugs(preferences: readonly MapPreference[]) {
  return new Set(
    preferences.filter((row) => !row.hidden).map((row) => row.mapSlug),
  );
}

export function selectedAgents(roster: readonly AgentPreference[]) {
  return new Map(
    roster
      .filter((row) => !(row.hidden ?? row.notes === "hidden"))
      .map((row) => [row.agentSlug, row]),
  );
}
