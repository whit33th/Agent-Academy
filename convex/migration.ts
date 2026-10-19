import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
// CLI-only import. The operator must back up the source and explicitly confirm
// its owner. No public endpoint can claim legacy records by username.
export const importLineups = internalMutation({
  args: { ownerTokenIdentifier: v.string(), records: v.array(v.object({ legacyId: v.string(), mapSlug: v.string(), agentSlug: v.string(), title: v.string(), description: v.optional(v.string()), abilityType: v.string(), imageUrl: v.string() })) },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    if (args.records.length > 50 || !args.ownerTokenIdentifier.includes("|")) throw new Error("Invalid explicit owner mapping or batch");
    let imported = 0; let skipped = 0;
    for (const record of args.records) {
      if (!record.imageUrl.startsWith("https://")) throw new Error("Invalid legacy image URL");
      const existing = await ctx.db.query("lineups").withIndex("by_legacyId", q => q.eq("legacyId", record.legacyId)).unique();
      if (existing) { if (existing.ownerTokenIdentifier !== args.ownerTokenIdentifier) throw new Error("Legacy owner mismatch"); skipped++; continue; }
      const now = Date.now();
      await ctx.db.insert("lineups", { ...record, ownerTokenIdentifier: args.ownerTokenIdentifier, isPublic: false, createdAt: now, updatedAt: now }); imported++;
    }
    return { imported, skipped };
  },
});
export const importRoster = internalMutation({
  args: { ownerTokenIdentifier: v.string(), records: v.array(v.object({ mapSlug: v.string(), agentSlug: v.string(), viability: v.optional(v.string()), notes: v.optional(v.string()) })) },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.records.length > 100 || !args.ownerTokenIdentifier.includes("|")) throw new Error("Invalid explicit owner mapping or batch");
    let imported = 0;
    for (const record of args.records) {
      const exists = await ctx.db.query("mapRoster").withIndex("by_owner_map_agent", q => q.eq("ownerTokenIdentifier", args.ownerTokenIdentifier).eq("mapSlug", record.mapSlug).eq("agentSlug", record.agentSlug)).unique();
      if (exists) continue;
      const now = Date.now(); await ctx.db.insert("mapRoster", { ...record, ownerTokenIdentifier: args.ownerTokenIdentifier, createdAt: now, updatedAt: now }); imported++;
    }
    return imported;
  },
});
