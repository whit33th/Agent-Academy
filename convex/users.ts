import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getViewerTokenIdentifier, requireViewerTokenIdentifier } from "./lib/auth";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const tokenIdentifier = await getViewerTokenIdentifier(ctx);
    if (!tokenIdentifier) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
  },
});

export const upsertMe = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireViewerTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("users", {
        tokenIdentifier,
        name: args.name,
        image: args.image,
        createdAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        image: args.image ?? existing.image,
      });
    }
    return { ok: true };
  },
});

