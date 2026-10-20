import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { preferences } from "./lib/preferences";
import { DEFAULT_PREFERENCES, isAppPreferences } from "../lib/settings/model";
import {
  getViewerTokenIdentifier,
  requireViewerTokenIdentifier,
} from "./lib/auth";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const tokenIdentifier = await getViewerTokenIdentifier(ctx);
    if (!tokenIdentifier) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier),
      )
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
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier),
      )
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

export const getPreferences = query({
  args: {},
  returns: preferences,
  handler: async (ctx) => {
    const tokenIdentifier = await getViewerTokenIdentifier(ctx);
    if (!tokenIdentifier) return DEFAULT_PREFERENCES;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier),
      )
      .unique();
    return user?.preferences ?? DEFAULT_PREFERENCES;
  },
});
export const setPreferences = mutation({
  args: { preferences: preferences.partial() },
  returns: preferences,
  handler: async (ctx, args) => {
    const tokenIdentifier = await requireViewerTokenIdentifier(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier),
      )
      .unique();
    const next = {
      ...(user?.preferences ?? DEFAULT_PREFERENCES),
      ...args.preferences,
    };
    if (!isAppPreferences(next))
      throw new Error("Volumes must be between 0 and 100%.");
    if (user) await ctx.db.patch(user._id, { preferences: next });
    else
      await ctx.db.insert("users", {
        tokenIdentifier,
        preferences: next,
        createdAt: Date.now(),
      });
    return next;
  },
});
