import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireViewerTokenIdentifier } from "./lib/auth";
export const record = internalMutation({
  args: { ownerTokenIdentifier: v.string(), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("uploads", { ...args, createdAt: Date.now() });
    return null;
  },
});

export const discard = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { storageId }) => {
    const owner = await requireViewerTokenIdentifier(ctx);
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .unique();
    if (!upload || upload.ownerTokenIdentifier !== owner)
      throw new Error("Forbidden image");
    const reference = await ctx.db
      .query("lineups")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    if (!reference) {
      await ctx.storage.delete(storageId);
      await ctx.db.delete(upload._id);
    }
    return null;
  },
});
