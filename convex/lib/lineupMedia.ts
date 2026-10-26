import { v } from "convex/values";
import type { Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export const lineupImageInput = v.object({
  storageId: v.optional(v.id("_storage")),
  imageUrl: v.optional(v.string()),
  imageAssetId: v.optional(v.string()),
  caption: v.string(),
});
export const lineupSource = v.object({
  url: v.string(),
  author: v.string(),
  publishedAt: v.optional(v.string()),
  checkedAt: v.number(),
  patch: v.string(),
  evidence: v.string(),
  rightsBasis: v.string(),
  testedInGame: v.boolean(),
});
export type LineupImageInput = Infer<typeof lineupImageInput>;

export async function readImages(
  ctx: QueryCtx | MutationCtx,
  row: Doc<"lineups">,
): Promise<LineupImageInput[]> {
  const children = await ctx.db
    .query("lineupImages")
    .withIndex("by_lineupId_and_order", (q) => q.eq("lineupId", row._id))
    .take(10);
  if (children.length)
    return children.map(({ storageId, imageUrl, imageAssetId, caption }) => ({
      storageId,
      imageUrl,
      imageAssetId,
      caption,
    }));
  return row.storageId || row.imageUrl
    ? [
        {
          storageId: row.storageId,
          imageUrl: row.imageUrl,
          imageAssetId: row.imageAssetId,
          caption: "",
        },
      ]
    : [];
}

export async function replaceImages(
  ctx: MutationCtx,
  id: Id<"lineups">,
  images: LineupImageInput[],
) {
  if (images.length > 10) throw new Error("Choose at most 10 images.");
  const old = await ctx.db
    .query("lineupImages")
    .withIndex("by_lineupId_and_order", (q) => q.eq("lineupId", id))
    .take(10);
  for (const child of old) await ctx.db.delete(child._id);
  for (const [order, image] of images.entries())
    await ctx.db.insert("lineupImages", {
      ...image,
      ...(image.storageId
        ? { imageUrl: undefined, imageAssetId: undefined }
        : {}),
      lineupId: id,
      order,
    });
}

export async function storageReferenced(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">,
) {
  return Boolean(
    (await ctx.db
      .query("lineups")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first()) ||
    (await ctx.db
      .query("lineupImages")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first()),
  );
}

export async function cleanupImage(
  ctx: MutationCtx,
  storageId?: Id<"_storage">,
) {
  if (!storageId || (await storageReferenced(ctx, storageId))) return;
  await ctx.storage.delete(storageId);
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();
  if (upload) await ctx.db.delete(upload._id);
}

export async function releaseAsset(ctx: MutationCtx, imageAssetId?: string) {
  if (!imageAssetId) return undefined;
  const used =
    (await ctx.db
      .query("lineups")
      .withIndex("by_imageAssetId", (q) => q.eq("imageAssetId", imageAssetId))
      .first()) ||
    (await ctx.db
      .query("lineupImages")
      .withIndex("by_imageAssetId", (q) => q.eq("imageAssetId", imageAssetId))
      .first());
  return used ? undefined : imageAssetId;
}
