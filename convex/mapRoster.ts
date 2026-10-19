import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getViewerTokenIdentifier, requireViewerTokenIdentifier } from "./lib/auth";
import { roster } from "./lib/validators";

export const listByMap = query({
  args: { mapSlug: v.string() },
  returns: v.array(roster),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await getViewerTokenIdentifier(ctx);
    if (!ownerTokenIdentifier) return [];
    return await ctx.db
      .query("mapRoster")
      .withIndex("by_owner_map", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier).eq("mapSlug", args.mapSlug),
      )
      .take(100);
  },
});

export const upsert = mutation({
  args: {
    mapSlug: v.string(),
    agentSlug: v.string(),
    viability: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("mapRoster"),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireViewerTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("mapRoster")
      .withIndex("by_owner_map_agent", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("mapSlug", args.mapSlug)
          .eq("agentSlug", args.agentSlug),
      )
      .unique();

    const now = Date.now();
    if (!existing) {
      return await ctx.db.insert("mapRoster", {
        ownerTokenIdentifier,
        mapSlug: args.mapSlug,
        agentSlug: args.agentSlug,
        viability: args.viability,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(existing._id, {
      viability: args.viability ?? existing.viability,
      notes: args.notes ?? existing.notes,
      updatedAt: now,
    });
    return existing._id;
  },
});

export const remove = mutation({
  args: {
    mapSlug: v.string(),
    agentSlug: v.string(),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireViewerTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("mapRoster")
      .withIndex("by_owner_map_agent", (q) =>
        q.eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("mapSlug", args.mapSlug)
          .eq("agentSlug", args.agentSlug),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true as const };
  },
});

