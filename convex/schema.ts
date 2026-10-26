import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { lineupMetadata } from "./lib/lineupMetadata";
import { preferences } from "./lib/preferences";
import { statsDivision, statsSnapshot } from "./lib/agentStatsValidators";
import { lineupSource } from "./lib/lineupMedia";

export default defineSchema({
  agentStatTargets: defineTable({
    mapSlug: v.string(),
    division: statsDivision,
    requestedDay: v.number(),
    completedDay: v.optional(v.number()),
    stage: v.union(
      v.literal("queued"),
      v.literal("scraping"),
      v.literal("reading"),
      v.literal("idle"),
      v.literal("failed"),
    ),
    nextAttemptAt: v.number(),
    failures: v.number(),
    jobId: v.optional(v.string()),
    jobStartedAt: v.optional(v.number()),
    readLeaseUntil: v.optional(v.number()),
    resultState: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("no_data"),
    ),
    lastCheckedAt: v.optional(v.number()),
    current: v.optional(statsSnapshot),
    previous: v.optional(statsSnapshot),
  })
    .index("by_mapSlug_and_division", ["mapSlug", "division"])
    .index("by_stage_and_nextAttemptAt", ["stage", "nextAttemptAt"]),
  agentStatSync: defineTable({
    key: v.literal("tracker"),
    consecutiveBlocks: v.number(),
    pausedUntil: v.number(),
    disabledReason: v.optional(
      v.union(v.literal("credentials"), v.literal("credits")),
    ),
  }).index("by_key", ["key"]),
  agentStatErrors: defineTable({
    mapSlug: v.string(),
    division: statsDivision,
    at: v.number(),
    kind: v.string(),
    message: v.string(),
  }).index("by_at", ["at"]),
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    preferences: v.optional(preferences),
    createdAt: v.number(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  maps: defineTable({
    slug: v.string(),
    enabled: v.boolean(),
    accentColor: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  uploads: defineTable({
    ownerTokenIdentifier: v.string(),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_storageId", ["storageId"]),
  mapPreferences: defineTable({
    ownerTokenIdentifier: v.string(),
    mapSlug: v.string(),
    hidden: v.boolean(),
  }).index("by_owner_map", ["ownerTokenIdentifier", "mapSlug"]),

  mapRoster: defineTable({
    ownerTokenIdentifier: v.string(),
    mapSlug: v.string(),
    agentSlug: v.string(),
    viability: v.optional(v.string()),
    notes: v.optional(v.string()),
    hidden: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_map", ["ownerTokenIdentifier", "mapSlug"])
    .index("by_owner_map_agent", [
      "ownerTokenIdentifier",
      "mapSlug",
      "agentSlug",
    ]),

  lineups: defineTable({
    ownerTokenIdentifier: v.string(),
    mapSlug: v.string(),
    agentSlug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    abilityType: v.string(),
    metadata: v.optional(lineupMetadata),
    coverIndex: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
    source: v.optional(lineupSource),
    importBatchId: v.optional(v.string()),
    sourceKey: v.optional(v.string()),
    contentHash: v.optional(v.string()),
    imageUrl: v.string(),
    imageStorageKey: v.optional(v.string()),
    imageAssetId: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    legacyId: v.optional(v.string()),
    isPublic: v.boolean(),
    forkedFromId: v.optional(v.id("lineups")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_map_agent", ["mapSlug", "agentSlug"])
    .index("by_map_agent_public", ["mapSlug", "agentSlug", "isPublic"])
    .index("by_map_public", ["mapSlug", "isPublic"])
    .index("by_storageId", ["storageId"])
    .index("by_imageAssetId", ["imageAssetId"])
    .index("by_owner_fork", ["ownerTokenIdentifier", "forkedFromId"])
    .index("by_legacyId", ["legacyId"])
    .index("by_owner_map_agent", [
      "ownerTokenIdentifier",
      "mapSlug",
      "agentSlug",
    ])
    .index("by_public_createdAt", ["isPublic", "createdAt"])
    .index("by_isPublic_mapSlug_createdAt", [
      "isPublic",
      "mapSlug",
      "createdAt",
    ])
    .index("by_isPublic_agentSlug_createdAt", [
      "isPublic",
      "agentSlug",
      "createdAt",
    ])
    .index("by_isPublic_mapSlug_agentSlug_createdAt", [
      "isPublic",
      "mapSlug",
      "agentSlug",
      "createdAt",
    ])
    .index("by_isPublic_agentSlug_abilitySlot_createdAt", [
      "isPublic",
      "agentSlug",
      "metadata.abilitySlot",
      "createdAt",
    ])
    .index("by_isPublic_mapSlug_agentSlug_abilitySlot_createdAt", [
      "isPublic",
      "mapSlug",
      "agentSlug",
      "metadata.abilitySlot",
      "createdAt",
    ])
    .index("by_sourceKey", ["sourceKey"])
    .index("by_videoUrl_and_ownerTokenIdentifier_and_isPublic", [
      "videoUrl",
      "ownerTokenIdentifier",
      "isPublic",
    ])
    .index("by_contentHash", ["contentHash"])
    .index("by_importBatchId", ["importBatchId"]),
  lineupImages: defineTable({
    lineupId: v.id("lineups"),
    order: v.number(),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    imageAssetId: v.optional(v.string()),
    caption: v.string(),
  })
    .index("by_lineupId_and_order", ["lineupId", "order"])
    .index("by_storageId", ["storageId"])
    .index("by_imageAssetId", ["imageAssetId"]),
});
