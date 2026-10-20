export const DIVISIONS = [
  "all",
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "ascendant",
  "immortal",
  "radiant",
] as const;
export type StatsDivision = (typeof DIVISIONS)[number];

// Standard bomb maps only; the catalog also includes TDM, training and skirmish maps.
export const STATS_MAPS = [
  "abyss",
  "ascent",
  "bind",
  "breeze",
  "corrode",
  "fracture",
  "haven",
  "icebox",
  "lotus",
  "pearl",
  "split",
  "summit",
  "sunset",
] as const;
export const DAY = 86_400_000;
export const STALE_AFTER = 2 * DAY;
export const RETRY_DELAYS = [2 * 60_000, 10 * 60_000, 60 * 60_000] as const;

export const DIVISION_OPTIONS = DIVISIONS.map((value) => ({
  value,
  label:
    value === "all" ? "All Ranks" : value[0].toUpperCase() + value.slice(1),
}));

export interface AgentStat {
  agentSlug: string;
  tier: "S" | "A" | "B" | "C" | "D";
  wlPercentage: number;
  nonMirroredWlPercentage: number;
  pickRate: number;
  playedPct: number;
}
export interface StatsSnapshot {
  mapSlug: string;
  division: StatsDivision;
  region: "eu";
  playlist: "competitive";
  windowDays: 14;
  fetchedAt: number;
  sourceUrl: string;
  agents: AgentStat[];
}
export interface MapAgentStats {
  mapSlug: string;
  division: StatsDivision;
  status: "ready" | "no_data" | "unavailable" | "unsupported";
  lastCheckedAt: number | null;
  snapshot: StatsSnapshot | null;
}
export function isStatsDivision(value: unknown): value is StatsDivision {
  return typeof value === "string" && DIVISIONS.some((item) => item === value);
}
export function supportsStats(mapSlug: string) {
  return STATS_MAPS.some((item) => item === mapSlug);
}
export function trackerUrl(mapSlug: string, division: StatsDivision) {
  if (!supportsStats(mapSlug)) throw new Error("Unsupported statistics map");
  const url = new URL("https://tracker.gg/valorant/insights/agents");
  url.searchParams.set("playlist", "competitive");
  url.searchParams.set("map", mapSlug);
  if (division !== "all") url.searchParams.set("division", division);
  url.searchParams.set("region", "eu");
  return url.toString();
}

export function trackerScrapeUrl(
  mapSlug: string,
  division: StatsDivision,
  startedAt: number,
) {
  const url = new URL(trackerUrl(mapSlug, division));
  // The pinned component does not forward Firecrawl's maxAge option. A unique
  // URL avoids its provider's default two-day cache as well as cached failures.
  // Tracker ignores this parameter; source links and all filters stay canonical.
  url.searchParams.set("aa_stats_refresh", String(startedAt));
  return url.toString();
}
export function sortAgentStats(agents: readonly AgentStat[]) {
  return [...agents].sort(
    (a, b) =>
      b.nonMirroredWlPercentage - a.nonMirroredWlPercentage ||
      b.pickRate - a.pickRate ||
      a.agentSlug.localeCompare(b.agentSlug, "en"),
  );
}

// Tracker omits agents with no observations (common in Radiant). Played % is
// a share of all agent observations, so a complete nonempty slice totals 100%.
export function hasCompletePlayedShare(agents: readonly AgentStat[]) {
  const total = agents.reduce((sum, agent) => sum + agent.playedPct, 0);
  return (
    agents.length > 0 && Math.abs(total - 100) <= agents.length * 0.005 + 0.01
  );
}
function isPercentage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}
export function isAgentStat(value: unknown): value is AgentStat {
  if (!value || typeof value !== "object") return false;
  return (
    "agentSlug" in value &&
    typeof value.agentSlug === "string" &&
    "tier" in value &&
    ["S", "A", "B", "C", "D"].includes(String(value.tier)) &&
    "wlPercentage" in value &&
    isPercentage(value.wlPercentage) &&
    "nonMirroredWlPercentage" in value &&
    isPercentage(value.nonMirroredWlPercentage) &&
    "pickRate" in value &&
    isPercentage(value.pickRate) &&
    "playedPct" in value &&
    isPercentage(value.playedPct)
  );
}
export function isMapAgentStats(value: unknown): value is MapAgentStats {
  if (!value || typeof value !== "object") return false;
  if (
    !("mapSlug" in value) ||
    typeof value.mapSlug !== "string" ||
    !("division" in value) ||
    !isStatsDivision(value.division) ||
    !("status" in value) ||
    !["ready", "no_data", "unavailable", "unsupported"].includes(
      String(value.status),
    ) ||
    !("lastCheckedAt" in value) ||
    !(
      value.lastCheckedAt === null ||
      (typeof value.lastCheckedAt === "number" &&
        Number.isFinite(value.lastCheckedAt))
    ) ||
    !("snapshot" in value)
  )
    return false;
  const s = value.snapshot;
  if (s === null) return value.status !== "ready";
  if (!supportsStats(value.mapSlug)) return false;
  return (
    typeof s === "object" &&
    s !== null &&
    "mapSlug" in s &&
    s.mapSlug === value.mapSlug &&
    "division" in s &&
    s.division === value.division &&
    "region" in s &&
    s.region === "eu" &&
    "playlist" in s &&
    s.playlist === "competitive" &&
    "windowDays" in s &&
    s.windowDays === 14 &&
    "sourceUrl" in s &&
    s.sourceUrl === trackerUrl(value.mapSlug, value.division) &&
    "fetchedAt" in s &&
    typeof s.fetchedAt === "number" &&
    Number.isFinite(s.fetchedAt) &&
    "agents" in s &&
    Array.isArray(s.agents) &&
    s.agents.length > 0 &&
    s.agents.length <= 100 &&
    s.agents.every(isAgentStat) &&
    new Set(s.agents.map((a) => a.agentSlug)).size === s.agents.length
  );
}
