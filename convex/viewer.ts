import { query } from "./_generated/server";
import { v } from "convex/values";

export const current = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ subject: v.string(), name: v.union(v.string(), v.null()) }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity
      ? { subject: identity.subject, name: identity.name ?? null }
      : null;
  },
});
