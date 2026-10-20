import catalog from "../generated/valorant-catalog.json";
import {
  isAgentStat,
  hasCompletePlayedShare,
  sortAgentStats,
  type AgentStat,
  type StatsDivision,
} from "./model";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Tracker: expected object");
  return value as Record<string, unknown>;
}
function percentage(stats: Record<string, unknown>, key: string) {
  const value = record(stats[key]).value;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  )
    throw new Error(`Tracker: invalid ${key}`);
  return value;
}

/** Parse only the JSON assignment. Never evaluate JavaScript from a scraped page. */
export function parseTrackerStats(
  html: string,
  mapSlug: string,
  division: StatsDivision,
): AgentStat[] {
  if (html.length > 8_000_000) throw new Error("Tracker: response too large");
  const scripts = html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi);
  let state: Record<string, unknown> | undefined;
  for (const script of scripts) {
    const match =
      /^\s*window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)\s*;?\s*$/.exec(script[1]);
    if (!match) continue;
    if (state) throw new Error("Tracker: duplicate initial state");
    state = record(JSON.parse(match[1]));
  }
  if (!state) {
    if (
      /just a moment|cf-chl-|captcha|access denied|verify you are human/i.test(
        html,
      )
    )
      throw new Error("Tracker: blocked page");
    throw new Error("Tracker: initial state missing or page format changed");
  }
  const blocks = record(record(state["insights-v2"]).insights);
  const key = `valorant|agents|${division === "all" ? "" : `division:${division},`}map:${mapSlug},playlist:competitive,region:eu`;
  const rows = record(blocks[key]).insights;
  if (!Array.isArray(rows) || rows.length > 100)
    throw new Error("Tracker: invalid agent list");
  // An explicit empty result for the exact filter is different from missing/blocked data.
  if (!rows.length) return [];
  const slugs = new Set<string>();
  const parsed = rows.map((value): AgentStat => {
    const row = record(value);
    const attr = record(row.attributes);
    if (
      row.type !== "insights-agent" ||
      attr.map !== mapSlug ||
      attr.region !== "eu" ||
      attr.playlist !== "competitive" ||
      attr.division !== (division === "all" ? null : division)
    )
      throw new Error("Tracker: filter mismatch");
    const agentSlug = attr.agent === "kay/o" ? "kayo" : attr.agent;
    if (
      typeof agentSlug !== "string" ||
      !Object.hasOwn(catalog.agents, agentSlug) ||
      slugs.has(agentSlug)
    )
      throw new Error("Tracker: unknown or duplicate agent");
    slugs.add(agentSlug);
    const stats = record(row.stats);
    const result = {
      agentSlug,
      tier: record(row.metadata).tier,
      wlPercentage: percentage(stats, "wlPercentage"),
      nonMirroredWlPercentage: percentage(stats, "nonMirroredWlPercentage"),
      pickRate: percentage(stats, "pickRate"),
      playedPct: percentage(stats, "playedPct"),
    };
    if (!isAgentStat(result)) throw new Error("Tracker: invalid agent tier");
    return result;
  });
  // Zero-observation agents may be absent. Validate the full observed population,
  // allowing only the source's two-decimal rounding error.
  if (!hasCompletePlayedShare(parsed))
    throw new Error("Tracker: incomplete agent list");
  return sortAgentStats(parsed);
}
