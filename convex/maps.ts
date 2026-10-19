import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireViewerTokenIdentifier, getViewerTokenIdentifier } from "./lib/auth";

export const listEnabled = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("maps"), _creationTime: v.number(), slug: v.string(), enabled: v.boolean(), accentColor: v.optional(v.string()), createdAt: v.number() })),
  handler: async (ctx) => {
    const maps = await ctx.db.query("maps").withIndex("by_slug").take(100);
    return maps.filter((m) => m.enabled);
  },
});

export const upsert = mutation({
  args: {
    slug: v.string(),
    enabled: v.optional(v.boolean()),
    accentColor: v.optional(v.string()),
  },
  returns: v.id("maps"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !process.env.OWNER_SUBJECT || identity.subject !== process.env.OWNER_SUBJECT) throw new Error("Project owner required");
    const existing = await ctx.db
      .query("maps")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    const now = Date.now();
    if (!existing) {
      return await ctx.db.insert("maps", {
        slug: args.slug,
        enabled: args.enabled ?? true,
        accentColor: args.accentColor,
        createdAt: now,
      });
    }

    await ctx.db.patch(existing._id, {
      enabled: args.enabled ?? existing.enabled,
      accentColor: args.accentColor ?? existing.accentColor,
    });
    return existing._id;
  },
});

export const preferences = query({
  args: {}, returns: v.array(v.object({ mapSlug: v.string(), hidden: v.boolean() })),
  handler: async ctx => {
    const owner = await getViewerTokenIdentifier(ctx);
    if (!owner) return [];
    const rows = await ctx.db.query("mapPreferences").withIndex("by_owner_map", q => q.eq("ownerTokenIdentifier", owner)).take(100);
    return rows.map(({ mapSlug, hidden }) => ({ mapSlug, hidden }));
  },
});
export const setPreference = mutation({
  args: { mapSlug: v.string(), hidden: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => {
    const owner = await requireViewerTokenIdentifier(ctx);
    const existing = await ctx.db.query("mapPreferences").withIndex("by_owner_map", q => q.eq("ownerTokenIdentifier", owner).eq("mapSlug", args.mapSlug)).unique();
    if (existing) await ctx.db.patch(existing._id, { hidden: args.hidden });
    else await ctx.db.insert("mapPreferences", { ...args, ownerTokenIdentifier: owner });
    return null;
  },
});

