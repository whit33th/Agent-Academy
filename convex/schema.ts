import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { lineupMetadata } from "./lib/lineupMetadata";
import { preferences } from "./lib/preferences";

export default defineSchema({
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
    .index("by_public_createdAt", ["isPublic", "createdAt"]),
});
