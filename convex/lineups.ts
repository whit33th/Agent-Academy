import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import catalog from "../lib/generated/valorant-catalog.json";
import {
  getViewerTokenIdentifier,
  requireViewerTokenIdentifier,
} from "./lib/auth";
import { lineup } from "./lib/validators";
import { lineupMetadata } from "./lib/lineupMetadata";
import { EMPTY_METADATA, isAbilitySlot } from "../lib/lineups/metadata";
import {
  isMapSlug,
  isAgentSlug,
  validateLineupSelection,
} from "../lib/catalog/lineup-options";
import {
  lineupImageInput,
  readImages,
  replaceImages,
  cleanupImage,
  releaseAsset,
  type LineupImageInput,
} from "./lib/lineupMedia";
import {
  getLineupVideoEmbedUrl,
  isSafeSourceUrl,
  normalizeVideoUrl,
  trackerClipKey,
} from "../lib/lineups/media";
import { IMPORT_OWNER } from "../lib/lineups/import-policy";
const SANITY_ASSET = /^image-([A-Za-z0-9]+)-(\d+x\d+)-(png|jpe?g|webp)$/;

// Resolve legacy copies without modifying their provenance or reading user records.
export const resolveVideoEmbed = query({
  args: { videoUrl: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    if (args.videoUrl.length > 2048) return null;
    const clip = trackerClipKey(args.videoUrl);
    if (!clip) return null;
    const row = await ctx.db
      .query("lineups")
      .withIndex("by_videoUrl_and_ownerTokenIdentifier_and_isPublic", (q) =>
        q
          .eq("videoUrl", `https://tracker.gg${clip}`)
          .eq("ownerTokenIdentifier", IMPORT_OWNER)
          .eq("isPublic", true),
      )
      .first();
    return row ? getLineupVideoEmbedUrl(args.videoUrl, row.source) : null;
  },
});

function assertSanityImage(imageUrl: string, imageAssetId: string) {
  const match = imageAssetId.match(SANITY_ASSET);
  if (!match) throw new Error("Invalid image");
  const [, hash, size, ext] = match;
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("Invalid image");
  }
  if (url.protocol !== "https:" || url.hostname !== "cdn.sanity.io")
    throw new Error("Invalid image");
  const file = `${hash}-${size}.${ext === "jpeg" ? "jpg" : ext}`;
  const alt = `${hash}-${size}.${ext}`;
  if (!url.pathname.endsWith(`/${file}`) && !url.pathname.endsWith(`/${alt}`))
    throw new Error("Invalid image");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (projectId && !url.pathname.startsWith(`/images/${projectId}/`))
    throw new Error("Invalid image");
}
async function resolve(
  ctx: QueryCtx,
  row: Doc<"lineups">,
  viewer?: string | null,
) {
  const images = await Promise.all(
    (await readImages(ctx, row)).map(async (image) => ({
      ...image,
      imageUrl: image.storageId
        ? ((await ctx.storage.getUrl(image.storageId)) ?? "")
        : (image.imageUrl ?? ""),
    })),
  );
  const coverIndex = Math.min(
    row.coverIndex ?? 0,
    Math.max(images.length - 1, 0),
  );
  return {
    ...row,
    images,
    coverIndex,
    canEdit: Boolean(viewer && row.ownerTokenIdentifier === viewer),
    imageUrl: images[coverIndex]?.imageUrl ?? "",
  };
}

export const listPublicByMapAgentPage = query({
  args: {
    mapSlug: v.string(),
    agentSlug: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(lineup),
  handler: async (ctx, args) => {
    const viewer = await getViewerTokenIdentifier(ctx);
    const result = await ctx.db
      .query("lineups")
      .withIndex("by_map_agent_public", (q) =>
        q
          .eq("mapSlug", args.mapSlug)
          .eq("agentSlug", args.agentSlug)
          .eq("isPublic", true),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((row) => resolve(ctx, row, viewer)),
      ),
    };
  },
});

export const listOwnedByMapAgentPage = query({
  args: {
    mapSlug: v.string(),
    agentSlug: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(lineup),
  handler: async (ctx, args) => {
    const viewer = await getViewerTokenIdentifier(ctx);
    if (!viewer) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("lineups")
      .withIndex("by_owner_map_agent", (q) =>
        q
          .eq("ownerTokenIdentifier", viewer)
          .eq("mapSlug", args.mapSlug)
          .eq("agentSlug", args.agentSlug),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((row) => resolve(ctx, row, viewer)),
      ),
    };
  },
});

export const listPublicFeedPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    mapSlug: v.optional(v.string()),
    agentSlug: v.optional(v.string()),
    abilitySlot: v.optional(v.string()),
  },
  returns: paginationResultValidator(lineup),
  handler: async (ctx, args) => {
    const { mapSlug, agentSlug, abilitySlot } = args;
    if (mapSlug !== undefined && !isMapSlug(mapSlug))
      throw new Error("Choose a known map.");
    if (agentSlug !== undefined && !isAgentSlug(agentSlug))
      throw new Error("Choose a known agent.");
    if (abilitySlot !== undefined) {
      if (!agentSlug)
        throw new Error("Choose an agent before filtering abilities.");
      if (
        !isAbilitySlot(abilitySlot) ||
        !isAgentSlug(agentSlug) ||
        !catalog.agents[agentSlug].abilities.some(
          (ability) => ability.slot === abilitySlot,
        )
      ) {
        throw new Error("This ability does not belong to the selected agent.");
      }
    }
    const viewer = await getViewerTokenIdentifier(ctx);
    const rows = ctx.db.query("lineups");
    const filtered = (() => {
      if (
        mapSlug !== undefined &&
        agentSlug !== undefined &&
        abilitySlot !== undefined
      )
        return rows.withIndex(
          "by_isPublic_mapSlug_agentSlug_abilitySlot_createdAt",
          (q) =>
            q
              .eq("isPublic", true)
              .eq("mapSlug", mapSlug)
              .eq("agentSlug", agentSlug)
              .eq("metadata.abilitySlot", abilitySlot),
        );
      if (agentSlug !== undefined && abilitySlot !== undefined)
        return rows.withIndex(
          "by_isPublic_agentSlug_abilitySlot_createdAt",
          (q) =>
            q
              .eq("isPublic", true)
              .eq("agentSlug", agentSlug)
              .eq("metadata.abilitySlot", abilitySlot),
        );
      if (mapSlug !== undefined && agentSlug !== undefined)
        return rows.withIndex("by_isPublic_mapSlug_agentSlug_createdAt", (q) =>
          q
            .eq("isPublic", true)
            .eq("mapSlug", mapSlug)
            .eq("agentSlug", agentSlug),
        );
      if (mapSlug !== undefined)
        return rows.withIndex("by_isPublic_mapSlug_createdAt", (q) =>
          q.eq("isPublic", true).eq("mapSlug", mapSlug),
        );
      if (agentSlug !== undefined)
        return rows.withIndex("by_isPublic_agentSlug_createdAt", (q) =>
          q.eq("isPublic", true).eq("agentSlug", agentSlug),
        );
      return rows.withIndex("by_public_createdAt", (q) =>
        q.eq("isPublic", true),
      );
    })();
    const result = await filtered.order("desc").paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((row) => resolve(ctx, row, viewer)),
      ),
    };
  },
});

export const collectionProgress = query({
  args: { mapSlug: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, { mapSlug }) => {
    const viewer = await getViewerTokenIdentifier(ctx);
    const present = await Promise.all(
      Object.keys(catalog.agents).map(async (agentSlug) => {
        const published = await ctx.db
          .query("lineups")
          .withIndex("by_map_agent_public", (q) =>
            q
              .eq("mapSlug", mapSlug)
              .eq("agentSlug", agentSlug)
              .eq("isPublic", true),
          )
          .first();
        const own =
          !published && viewer
            ? await ctx.db
                .query("lineups")
                .withIndex("by_owner_map_agent", (q) =>
                  q
                    .eq("ownerTokenIdentifier", viewer)
                    .eq("mapSlug", mapSlug)
                    .eq("agentSlug", agentSlug),
                )
                .first()
            : null;
        return published || own ? agentSlug : null;
      }),
    );
    return present.filter((slug): slug is string => slug !== null);
  },
});
async function requireImage(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  owner: string,
) {
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();
  if (!upload || upload.ownerTokenIdentifier !== owner)
    throw new Error("Forbidden image");
  if (!(await ctx.db.system.get(storageId)))
    throw new Error("Image no longer exists");
}
async function validateImages(
  ctx: MutationCtx,
  images: LineupImageInput[],
  owner: string,
  row?: Doc<"lineups">,
) {
  if (images.length > 10) throw new Error("Choose at most 10 images.");
  const existing = row ? await readImages(ctx, row) : [];
  for (const image of images) {
    if (image.caption.length > 2000)
      throw new Error("Image caption is too long");
    if (image.storageId) {
      // Owners may retain a shared photograph from a copied lineup, but cannot attach arbitrary storage IDs.
      if (!existing.some((item) => item.storageId === image.storageId))
        await requireImage(ctx, image.storageId, owner);
      else if (!(await ctx.db.system.get(image.storageId)))
        throw new Error("Image no longer exists");
    } else {
      if (!image.imageUrl || !image.imageAssetId)
        throw new Error("Choose an image.");
      assertSanityImage(image.imageUrl, image.imageAssetId);
    }
  }
}
function coverFields(images: LineupImageInput[], coverIndex: number) {
  if (
    !Number.isInteger(coverIndex) ||
    coverIndex < 0 ||
    (images.length ? coverIndex >= images.length : coverIndex !== 0)
  )
    throw new Error("Invalid cover image");
  const cover = images[coverIndex];
  return {
    storageId: cover?.storageId,
    imageUrl: cover?.storageId ? "" : (cover?.imageUrl ?? ""),
    imageAssetId: cover?.storageId ? undefined : cover?.imageAssetId,
    coverIndex,
    imageStorageKey: undefined,
  };
}
function legacyImage(args: {
  storageId?: Id<"_storage">;
  imageUrl?: string;
  imageAssetId?: string;
}): LineupImageInput[] {
  return args.storageId || args.imageUrl
    ? [
        {
          storageId: args.storageId,
          imageUrl: args.storageId ? undefined : args.imageUrl,
          imageAssetId: args.storageId ? undefined : args.imageAssetId,
          caption: "",
        },
      ]
    : [];
}
async function cleanupRemoved(ctx: MutationCtx, images: LineupImageInput[]) {
  for (const storageId of new Set(
    images.flatMap((image) => (image.storageId ? [image.storageId] : [])),
  ))
    await cleanupImage(ctx, storageId);
  const released: string[] = [];
  for (const asset of new Set(
    images.flatMap((image) => (image.imageAssetId ? [image.imageAssetId] : [])),
  )) {
    const value = await releaseAsset(ctx, asset);
    if (value) released.push(value);
  }
  return released;
}
function validateText(title: string, description = "") {
  if (!title.trim() || title.length > 160 || description.length > 5000)
    throw new Error("Invalid title or description");
}
export const listByMapAgent = query({
  args: { mapSlug: v.string(), agentSlug: v.string() },
  returns: v.array(lineup),
  handler: async (ctx, args) => {
    const [viewer, published] = await Promise.all([
      getViewerTokenIdentifier(ctx),
      ctx.db
        .query("lineups")
        .withIndex("by_map_agent_public", (q) =>
          q
            .eq("mapSlug", args.mapSlug)
            .eq("agentSlug", args.agentSlug)
            .eq("isPublic", true),
        )
        .take(200),
    ]);
    const owned = viewer
      ? await ctx.db
          .query("lineups")
          .withIndex("by_owner_map_agent", (q) =>
            q
              .eq("ownerTokenIdentifier", viewer)
              .eq("mapSlug", args.mapSlug)
              .eq("agentSlug", args.agentSlug),
          )
          .take(200)
      : [];
    return Promise.all(
      [
        ...new Map(
          [...published, ...owned].map((row) => [row._id, row]),
        ).values(),
      ].map((row) => resolve(ctx, row, viewer)),
    );
  },
});
export const listPublicFeed = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(lineup),
  handler: async (ctx, args) => {
    const viewer = await getViewerTokenIdentifier(ctx);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 50), 1), 200);
    const rows = await ctx.db
      .query("lineups")
      .withIndex("by_public_createdAt", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(limit);
    return Promise.all(rows.map((row) => resolve(ctx, row, viewer)));
  },
});
export const countsByMap = query({
  args: { mapSlug: v.string() },
  returns: v.record(v.string(), v.number()),
  handler: async (ctx, args) => {
    const [owner, published] = await Promise.all([
      getViewerTokenIdentifier(ctx),
      ctx.db
        .query("lineups")
        .withIndex("by_map_public", (q) =>
          q.eq("mapSlug", args.mapSlug).eq("isPublic", true),
        )
        .take(1000),
    ]);
    const own = owner
      ? await ctx.db
          .query("lineups")
          .withIndex("by_owner_map_agent", (q) =>
            q.eq("ownerTokenIdentifier", owner).eq("mapSlug", args.mapSlug),
          )
          .take(1000)
      : [];
    const counts: Record<string, number> = {};
    for (const row of new Map(
      [...published, ...own].map((row) => [row._id, row]),
    ).values())
      counts[row.agentSlug] = (counts[row.agentSlug] ?? 0) + 1;
    return counts;
  },
});
export const create = mutation({
  args: {
    mapSlug: v.string(),
    agentSlug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    abilityType: v.string(),
    metadata: v.optional(lineupMetadata),
    images: v.optional(v.array(lineupImageInput)),
    coverIndex: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    imageAssetId: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.object({ id: v.id("lineups") }),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireViewerTokenIdentifier(ctx);
    validateText(args.title, args.description);
    if (args.metadata)
      validateLineupSelection(args.mapSlug, args.agentSlug, args.metadata);
    if (
      !/^[a-z0-9-]{1,64}$/.test(args.mapSlug) ||
      !/^[a-z0-9-]{1,64}$/.test(args.agentSlug)
    )
      throw new Error("Invalid map or agent");
    const now = Date.now();
    const base = {
      ownerTokenIdentifier,
      mapSlug: args.mapSlug,
      agentSlug: args.agentSlug,
      title: args.title,
      description: args.description,
      abilityType: args.abilityType,
      metadata: args.metadata ?? EMPTY_METADATA,
      isPublic: args.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    };
    const images = args.images ?? legacyImage(args);
    const videoUrl = args.videoUrl
      ? normalizeVideoUrl(args.videoUrl)
      : undefined;
    if (!images.length && (!videoUrl || !isSafeSourceUrl(videoUrl)))
      throw new Error("Choose an image or a safe external video source.");
    await validateImages(ctx, images, ownerTokenIdentifier);
    const id = await ctx.db.insert("lineups", {
      ...base,
      ...coverFields(images, args.coverIndex ?? 0),
      videoUrl,
    });
    await replaceImages(ctx, id, images);
    return { id };
  },
});
const released = v.object({
  ok: v.literal(true),
  releasedAssetId: v.optional(v.string()),
  releasedAssetIds: v.optional(v.array(v.string())),
  mapSlug: v.optional(v.string()),
  agentSlug: v.optional(v.string()),
});
export const update = mutation({
  args: {
    id: v.id("lineups"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    abilityType: v.optional(v.string()),
    metadata: v.optional(lineupMetadata),
    images: v.optional(v.array(lineupImageInput)),
    coverIndex: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    imageAssetId: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  returns: released,
  handler: async (ctx, args) => {
    const owner = await requireViewerTokenIdentifier(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.ownerTokenIdentifier !== owner)
      throw new Error("Forbidden");
    validateText(args.title ?? row.title, args.description ?? row.description);
    if (args.metadata)
      validateLineupSelection(row.mapSlug, row.agentSlug, args.metadata);
    const oldImages = await readImages(ctx, row);
    const replacingLegacy =
      args.storageId !== undefined ||
      args.imageUrl !== undefined ||
      args.imageAssetId !== undefined;
    const images =
      args.images ?? (replacingLegacy ? legacyImage(args) : oldImages);
    const coverIndex =
      args.coverIndex ??
      (replacingLegacy || args.images ? 0 : (row.coverIndex ?? 0));
    const videoUrl =
      args.videoUrl === undefined
        ? row.videoUrl
        : args.videoUrl.trim()
          ? normalizeVideoUrl(args.videoUrl)
          : undefined;
    if (!images.length && (!videoUrl || !isSafeSourceUrl(videoUrl)))
      throw new Error("Choose an image or a safe external video source.");
    await validateImages(ctx, images, owner, row);
    await ctx.db.patch(args.id, {
      title: args.title ?? row.title,
      description: args.description ?? row.description,
      abilityType: args.abilityType ?? row.abilityType,
      metadata: args.metadata ?? row.metadata,
      ...coverFields(images, coverIndex),
      videoUrl,
      isPublic: args.isPublic ?? row.isPublic,
      updatedAt: Date.now(),
    });
    if (args.images !== undefined || replacingLegacy)
      await replaceImages(ctx, row._id, images);
    const releasedAssetIds = await cleanupRemoved(ctx, oldImages);
    return {
      ok: true as const,
      releasedAssetId: releasedAssetIds[0],
      releasedAssetIds,
      mapSlug: row.mapSlug,
      agentSlug: row.agentSlug,
    };
  },
});
export const remove = mutation({
  args: { id: v.id("lineups") },
  returns: released,
  handler: async (ctx, args) => {
    const owner = await requireViewerTokenIdentifier(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) return { ok: true as const };
    if (row.ownerTokenIdentifier !== owner) throw new Error("Forbidden");
    const images = await readImages(ctx, row);
    await replaceImages(ctx, row._id, []);
    await ctx.db.delete(row._id);
    const releasedAssetIds = await cleanupRemoved(ctx, images);
    return {
      ok: true as const,
      releasedAssetId: releasedAssetIds[0],
      releasedAssetIds,
      mapSlug: row.mapSlug,
      agentSlug: row.agentSlug,
    };
  },
});
export const forkPublic = mutation({
  args: {
    sourceId: v.id("lineups"),
    mapSlug: v.string(),
    agentSlug: v.string(),
  },
  returns: v.object({ id: v.id("lineups") }),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireViewerTokenIdentifier(ctx);
    const source = await ctx.db.get(args.sourceId);
    if (
      !source?.isPublic ||
      source.mapSlug !== args.mapSlug ||
      source.agentSlug !== args.agentSlug
    )
      throw new Error("Forbidden");
    const existing = await ctx.db
      .query("lineups")
      .withIndex("by_owner_fork", (q) =>
        q
          .eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("forkedFromId", source._id),
      )
      .first();
    if (existing) return { id: existing._id };
    const {
      _id,
      _creationTime,
      legacyId,
      importBatchId,
      sourceKey,
      contentHash,
      ...data
    } = source;
    void importBatchId;
    void sourceKey;
    void contentHash;
    void _creationTime;
    void legacyId;
    const now = Date.now();
    const id = await ctx.db.insert("lineups", {
      ...data,
      ownerTokenIdentifier,
      isPublic: false,
      forkedFromId: _id,
      createdAt: now,
      updatedAt: now,
    });
    await replaceImages(ctx, id, await readImages(ctx, source));
    return { id };
  },
});
