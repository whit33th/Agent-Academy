import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getViewerTokenIdentifier, requireViewerTokenIdentifier } from "./lib/auth";
import { lineup } from "./lib/validators";
const SANITY_ASSET = /^image-([A-Za-z0-9]+)-(\d+x\d+)-(png|jpe?g|webp)$/;

function assertSanityImage(imageUrl: string, imageAssetId: string) {
  const match = imageAssetId.match(SANITY_ASSET);
  if (!match) throw new Error("Invalid image");
  const [, hash, size, ext] = match;
  let url: URL;
  try { url = new URL(imageUrl); } catch { throw new Error("Invalid image"); }
  if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io") throw new Error("Invalid image");
  const file = `${hash}-${size}.${ext === "jpeg" ? "jpg" : ext}`;
  const alt = `${hash}-${size}.${ext}`;
  if (!url.pathname.endsWith(`/${file}`) && !url.pathname.endsWith(`/${alt}`)) throw new Error("Invalid image");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (projectId && !url.pathname.startsWith(`/images/${projectId}/`)) throw new Error("Invalid image");
}
async function resolve(ctx: QueryCtx, row: Doc<"lineups">) {
  return { ...row, imageUrl: row.storageId ? (await ctx.storage.getUrl(row.storageId)) ?? "" : row.imageUrl };
}
async function requireImage(ctx: MutationCtx, storageId: Id<"_storage">, owner: string) {
  const upload = await ctx.db.query("uploads").withIndex("by_storageId", q => q.eq("storageId", storageId)).unique();
  if (!upload || upload.ownerTokenIdentifier !== owner) throw new Error("Forbidden image");
  if (!(await ctx.db.system.get(storageId))) throw new Error("Image no longer exists");
}
async function cleanupImage(ctx: MutationCtx, storageId?: Id<"_storage">) {
  if (!storageId) return;
  const used = await ctx.db.query("lineups").withIndex("by_storageId", q => q.eq("storageId", storageId)).first();
  if (!used) {
    await ctx.storage.delete(storageId);
    const upload = await ctx.db.query("uploads").withIndex("by_storageId", q => q.eq("storageId", storageId)).unique();
    if (upload) await ctx.db.delete(upload._id);
  }
}
async function releaseAsset(ctx: MutationCtx, imageAssetId?: string) {
  if (!imageAssetId) return undefined;
  const used = await ctx.db.query("lineups").withIndex("by_imageAssetId", q => q.eq("imageAssetId", imageAssetId)).first();
  return used ? undefined : imageAssetId;
}
function validateText(title: string, description = "") {
  if (!title.trim() || title.length > 160 || description.length > 5000) throw new Error("Invalid title or description");
}
export const listByMapAgent = query({
  args: { mapSlug: v.string(), agentSlug: v.string() }, returns: v.array(lineup),
  handler: async (ctx, args) => {
    const [viewer, published] = await Promise.all([
      getViewerTokenIdentifier(ctx),
      ctx.db.query("lineups").withIndex("by_map_agent_public", q => q.eq("mapSlug", args.mapSlug).eq("agentSlug", args.agentSlug).eq("isPublic", true)).take(200),
    ]);
    const owned = viewer ? await ctx.db.query("lineups").withIndex("by_owner_map_agent", q => q.eq("ownerTokenIdentifier", viewer).eq("mapSlug", args.mapSlug).eq("agentSlug", args.agentSlug)).take(200) : [];
    return Promise.all([...new Map([...published, ...owned].map(row => [row._id, row])).values()].map(row => resolve(ctx, row)));
  },
});
export const listPublicFeed = query({
  args: { limit: v.optional(v.number()) }, returns: v.array(lineup),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 50), 1), 200);
    const rows = await ctx.db.query("lineups").withIndex("by_public_createdAt", q => q.eq("isPublic", true)).order("desc").take(limit);
    return Promise.all(rows.map(row => resolve(ctx, row)));
  },
});
export const countsByMap = query({
  args: { mapSlug: v.string() }, returns: v.record(v.string(), v.number()),
  handler: async (ctx, args) => {
    const [owner, published] = await Promise.all([
      getViewerTokenIdentifier(ctx),
      ctx.db.query("lineups").withIndex("by_map_public", q => q.eq("mapSlug", args.mapSlug).eq("isPublic", true)).take(1000),
    ]);
    const own = owner ? await ctx.db.query("lineups").withIndex("by_owner_map_agent", q => q.eq("ownerTokenIdentifier", owner).eq("mapSlug", args.mapSlug)).take(1000) : [];
    const counts: Record<string, number> = {};
    for (const row of new Map([...published, ...own].map(row => [row._id, row])).values()) counts[row.agentSlug] = (counts[row.agentSlug] ?? 0) + 1;
    return counts;
  },
});
export const create = mutation({
  args: { mapSlug: v.string(), agentSlug: v.string(), title: v.string(), description: v.optional(v.string()), abilityType: v.string(), storageId: v.optional(v.id("_storage")), imageUrl: v.optional(v.string()), imageAssetId: v.optional(v.string()), isPublic: v.optional(v.boolean()) },
  returns: v.object({ id: v.id("lineups") }),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireViewerTokenIdentifier(ctx);
    validateText(args.title, args.description);
    if (!/^[a-z0-9-]{1,64}$/.test(args.mapSlug) || !/^[a-z0-9-]{1,64}$/.test(args.agentSlug)) throw new Error("Invalid map or agent");
    const now = Date.now();
    const base = { ownerTokenIdentifier, mapSlug: args.mapSlug, agentSlug: args.agentSlug, title: args.title, description: args.description, abilityType: args.abilityType, isPublic: args.isPublic ?? false, createdAt: now, updatedAt: now };
    if (args.storageId) {
      await requireImage(ctx, args.storageId, ownerTokenIdentifier);
      return { id: await ctx.db.insert("lineups", { ...base, storageId: args.storageId, imageUrl: "" }) };
    }
    if (!args.imageUrl || !args.imageAssetId) throw new Error("Choose an image.");
    assertSanityImage(args.imageUrl, args.imageAssetId);
    return { id: await ctx.db.insert("lineups", { ...base, imageUrl: args.imageUrl, imageAssetId: args.imageAssetId }) };
  },
});
const released = v.object({ ok: v.literal(true), releasedAssetId: v.optional(v.string()), mapSlug: v.optional(v.string()), agentSlug: v.optional(v.string()) });
export const update = mutation({
  args: { id: v.id("lineups"), title: v.optional(v.string()), description: v.optional(v.string()), abilityType: v.optional(v.string()), storageId: v.optional(v.id("_storage")), imageUrl: v.optional(v.string()), imageAssetId: v.optional(v.string()), isPublic: v.optional(v.boolean()) },
  returns: released,
  handler: async (ctx, args) => {
    const owner = await requireViewerTokenIdentifier(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.ownerTokenIdentifier !== owner) throw new Error("Forbidden");
    validateText(args.title ?? row.title, args.description ?? row.description);
    if (args.storageId) await requireImage(ctx, args.storageId, owner);
    if (args.imageAssetId || args.imageUrl) {
      if (!args.imageAssetId || !args.imageUrl) throw new Error("Invalid image");
      assertSanityImage(args.imageUrl, args.imageAssetId);
    }
    const { id, ...updates } = args;
    const patch = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));
    await ctx.db.patch(id, { ...patch, ...(args.imageAssetId ? { storageId: undefined } : {}), updatedAt: Date.now() });
    if (args.imageAssetId && row.storageId) await cleanupImage(ctx, row.storageId);
    else if (args.storageId && args.storageId !== row.storageId) await cleanupImage(ctx, row.storageId);
    const releasedAssetId = args.imageAssetId && args.imageAssetId !== row.imageAssetId ? await releaseAsset(ctx, row.imageAssetId) : undefined;
    return { ok: true as const, releasedAssetId, mapSlug: row.mapSlug, agentSlug: row.agentSlug };
  },
});
export const remove = mutation({
  args: { id: v.id("lineups") }, returns: released,
  handler: async (ctx, args) => {
    const owner = await requireViewerTokenIdentifier(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: true as const };
    if (row.ownerTokenIdentifier !== owner) throw new Error("Forbidden");
    await ctx.db.delete(row._id);
    await cleanupImage(ctx, row.storageId);
    return { ok: true as const, releasedAssetId: await releaseAsset(ctx, row.imageAssetId), mapSlug: row.mapSlug, agentSlug: row.agentSlug };
  },
});
export const forkPublic = mutation({
  args: { sourceId: v.id("lineups"), mapSlug: v.string(), agentSlug: v.string() }, returns: v.object({ id: v.id("lineups") }),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireViewerTokenIdentifier(ctx);
    const source = await ctx.db.get(args.sourceId);
    if (!source?.isPublic || source.mapSlug !== args.mapSlug || source.agentSlug !== args.agentSlug) throw new Error("Forbidden");
    const { _id, _creationTime, legacyId, ...data } = source;
    void _creationTime;
    void legacyId;
    const now = Date.now();
    return { id: await ctx.db.insert("lineups", { ...data, ownerTokenIdentifier, isPublic: false, forkedFromId: _id, createdAt: now, updatedAt: now }) };
  },
});
