import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const record = internalMutation({
  args: { ownerTokenIdentifier: v.string(), storageId: v.id("_storage") }, returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.insert("uploads", { ...args, createdAt: Date.now() }); return null; },
});
