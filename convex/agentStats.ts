import { query } from "./_generated/server";
import { statsDivision, statsResult } from "./lib/agentStatsValidators";
import { supportsStats } from "../lib/agent-stats/model";
import { v } from "convex/values";

// Shared public statistics. Clients cannot trigger paid scrapes or supply source URLs.
export const getByMap = query({
  args: { mapSlug: v.string(), division: statsDivision },
  returns: statsResult,
  handler: async (ctx, args) => {
    const empty = { ...args, lastCheckedAt: null, snapshot: null };
    if (!supportsStats(args.mapSlug))
      return { ...empty, status: "unsupported" as const };
    const target = await ctx.db
      .query("agentStatTargets")
      .withIndex("by_mapSlug_and_division", (q) =>
        q.eq("mapSlug", args.mapSlug).eq("division", args.division),
      )
      .unique();
    if (!target) return { ...empty, status: "unavailable" as const };
    return {
      ...args,
      lastCheckedAt: target.lastCheckedAt ?? null,
      status:
        target.resultState === "no_data"
          ? ("no_data" as const)
          : target.current
            ? ("ready" as const)
            : ("unavailable" as const),
      snapshot:
        target.resultState === "no_data" ? null : (target.current ?? null),
    };
  },
});
