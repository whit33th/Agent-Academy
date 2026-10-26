import { v, type Infer } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { lineupMetadata } from "./lib/lineupMetadata";
import {
  lineupImageInput,
  lineupSource,
  replaceImages,
} from "./lib/lineupMedia";
import {
  hasPlayableVideo,
  IMPORT_OWNER,
  LINEUP_BASELINE,
  validateImportCandidate,
} from "../lib/lineups/import-policy";
import { normalizeVideoUrl } from "../lib/lineups/media";

const candidate = v.object({
  sourceKey: v.string(),
  contentHash: v.string(),
  mapSlug: v.string(),
  agentSlug: v.string(),
  title: v.string(),
  description: v.string(),
  abilityType: v.optional(v.string()),
  metadata: lineupMetadata,
  videoUrl: v.optional(v.string()),
  source: lineupSource,
  images: v.optional(v.array(lineupImageInput)),
  coverIndex: v.optional(v.number()),
});
const result = v.object({
  sourceKey: v.string(),
  status: v.union(
    v.literal("ready"),
    v.literal("exists"),
    v.literal("rejected"),
  ),
  reason: v.optional(v.string()),
});
type Candidate = Infer<typeof candidate>;
async function inspect(ctx: QueryCtx | MutationCtx, record: Candidate) {
  try {
    validateImportCandidate(record);
    const images = record.images ?? [];
    if (images.length > 10 || (!images.length && !hasPlayableVideo(record)))
      throw new Error("Provide photos or an embeddable YouTube video");
    if (
      record.coverIndex !== undefined &&
      (!Number.isInteger(record.coverIndex) ||
        record.coverIndex < 0 ||
        record.coverIndex >= Math.max(images.length, 1))
    )
      throw new Error("Invalid cover image");
    for (const image of images) {
      // Imported photos must already be reviewed and stored on our own server.
      if (
        !image.storageId ||
        image.imageUrl ||
        image.imageAssetId ||
        image.caption.length > 2000
      )
        throw new Error(
          "Imported photos require an owned storage file and a short caption",
        );
      const upload = await ctx.db
        .query("uploads")
        .withIndex("by_storageId", (q) => q.eq("storageId", image.storageId!))
        .unique();
      if (
        upload?.ownerTokenIdentifier !== IMPORT_OWNER ||
        !(await ctx.db.system.get(image.storageId))
      )
        throw new Error("Unregistered import photo");
    }
    const existing = await ctx.db
      .query("lineups")
      .withIndex("by_sourceKey", (q) => q.eq("sourceKey", record.sourceKey))
      .first();
    const duplicate = await ctx.db
      .query("lineups")
      .withIndex("by_contentHash", (q) =>
        q.eq("contentHash", record.contentHash),
      )
      .first();
    if (existing || duplicate)
      return { sourceKey: record.sourceKey, status: "exists" as const };
    return { sourceKey: record.sourceKey, status: "ready" as const };
  } catch (error) {
    return {
      sourceKey: record.sourceKey,
      status: "rejected" as const,
      reason: error instanceof Error ? error.message : "Invalid candidate",
    };
  }
}

export const preview = internalQuery({
  args: { records: v.array(candidate) },
  returns: v.array(result),
  handler: async (ctx, args) => {
    if (args.records.length > 20)
      throw new Error("Preview at most 20 candidates per batch");
    const seen = new Set<string>();
    return Promise.all(
      args.records.map((record) => {
        if (seen.has(record.sourceKey) || seen.has(record.contentHash))
          return {
            sourceKey: record.sourceKey,
            status: "rejected" as const,
            reason: "Duplicate within batch",
          };
        seen.add(record.sourceKey);
        seen.add(record.contentHash);
        return inspect(ctx, record);
      }),
    );
  },
});

export const publish = internalMutation({
  args: { batchId: v.string(), records: v.array(candidate) },
  returns: v.array(result),
  handler: async (ctx, args) => {
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(args.batchId) ||
      args.records.length > 20
    )
      throw new Error("Invalid batch (maximum 20 records)");
    const results: Infer<typeof result>[] = [];
    for (const record of args.records) {
      const checked = await inspect(ctx, record);
      results.push(checked);
      if (checked.status !== "ready") continue;
      const images = record.images ?? [];
      const coverIndex = record.coverIndex ?? 0;
      const now = Date.now();
      const id = await ctx.db.insert("lineups", {
        ownerTokenIdentifier: IMPORT_OWNER,
        sourceKey: record.sourceKey,
        contentHash: record.contentHash,
        importBatchId: args.batchId,
        source: record.source,
        mapSlug: record.mapSlug,
        agentSlug: record.agentSlug,
        title: record.title.trim(),
        description: record.description.trim(),
        metadata: record.metadata,
        abilityType: "other",
        videoUrl: record.videoUrl
          ? normalizeVideoUrl(record.videoUrl)
          : undefined,
        coverIndex,
        storageId: images[coverIndex]?.storageId,
        imageUrl: "",
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      });
      await replaceImages(ctx, id, images);
    }
    return results;
  },
});

export const batchStatus = internalQuery({
  args: { batchId: v.string() },
  returns: v.object({
    patch: v.string(),
    total: v.number(),
    published: v.number(),
    byMap: v.record(v.string(), v.number()),
    byAgent: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("lineups")
      .withIndex("by_importBatchId", (q) => q.eq("importBatchId", args.batchId))
      .take(501);
    const byMap: Record<string, number> = {},
      byAgent: Record<string, number> = {};
    for (const row of rows) {
      byMap[row.mapSlug] = (byMap[row.mapSlug] ?? 0) + 1;
      byAgent[row.agentSlug] = (byAgent[row.agentSlug] ?? 0) + 1;
    }
    return {
      patch: LINEUP_BASELINE.patch,
      total: rows.length,
      published: rows.filter((row) => row.isPublic).length,
      byMap,
      byAgent,
    };
  },
});

// Strengthen provenance without overwriting content, feed order, visibility or personal copies.
export const refreshReviews = internalMutation({
  args: {
    records: v.array(candidate),
    refreshDescription: v.optional(v.boolean()),
  },
  returns: v.object({ updated: v.number() }),
  handler: async (ctx, args) => {
    if (args.records.length > 20)
      throw new Error("Review at most 20 records per batch");
    let updated = 0;
    for (const record of args.records) {
      validateImportCandidate(record);
      const row = await ctx.db
        .query("lineups")
        .withIndex("by_sourceKey", (q) => q.eq("sourceKey", record.sourceKey))
        .first();
      if (
        row?.ownerTokenIdentifier !== IMPORT_OWNER ||
        (!args.refreshDescription && row.contentHash !== record.contentHash)
      )
        continue;
      if (row.mapSlug !== record.mapSlug || row.agentSlug !== record.agentSlug)
        throw new Error("A content revision cannot change map or agent");
      await ctx.db.patch(row._id, {
        source: record.source,
        ...(args.refreshDescription
          ? {
              description: record.description.trim(),
              contentHash: record.contentHash,
            }
          : {}),
      });
      updated++;
    }
    return { updated };
  },
});

export const withdrawBatch = internalMutation({
  args: { batchId: v.string() },
  returns: v.object({ withdrawn: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("lineups")
      .withIndex("by_importBatchId", (q) => q.eq("importBatchId", args.batchId))
      .take(501);
    if (rows.length > 500)
      throw new Error("Batch too large; split before withdrawal");
    let withdrawn = 0;
    for (const row of rows)
      if (row.ownerTokenIdentifier === IMPORT_OWNER && row.isPublic) {
        await ctx.db.patch(row._id, { isPublic: false, updatedAt: Date.now() });
        withdrawn++;
      }
    return { withdrawn };
  },
});
