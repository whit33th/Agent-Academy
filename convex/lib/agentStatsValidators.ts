import { v } from "convex/values";
export const statsDivision = v.union(
  v.literal("all"),
  v.literal("iron"),
  v.literal("bronze"),
  v.literal("silver"),
  v.literal("gold"),
  v.literal("platinum"),
  v.literal("diamond"),
  v.literal("ascendant"),
  v.literal("immortal"),
  v.literal("radiant"),
);
export const agentStat = v.object({
  agentSlug: v.string(),
  tier: v.union(
    v.literal("S"),
    v.literal("A"),
    v.literal("B"),
    v.literal("C"),
    v.literal("D"),
  ),
  wlPercentage: v.number(),
  nonMirroredWlPercentage: v.number(),
  pickRate: v.number(),
  playedPct: v.number(),
});
export const statsSnapshot = v.object({
  mapSlug: v.string(),
  division: statsDivision,
  region: v.literal("eu"),
  playlist: v.literal("competitive"),
  windowDays: v.literal(14),
  fetchedAt: v.number(),
  sourceUrl: v.string(),
  agents: v.array(agentStat),
});
export const statsResult = v.object({
  mapSlug: v.string(),
  division: statsDivision,
  status: v.union(
    v.literal("ready"),
    v.literal("no_data"),
    v.literal("unavailable"),
    v.literal("unsupported"),
  ),
  lastCheckedAt: v.union(v.number(), v.null()),
  snapshot: v.union(statsSnapshot, v.null()),
});
