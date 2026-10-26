"use client";

import { useMemo } from "react";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import { usePersistedValue } from "./usePersistedValue";
import { useCollectionConnection } from "./useCollectionConnection";
import {
  getTrackerEmbedUrl,
  isSafeSourceUrl,
  MAX_LINEUP_IMAGES,
} from "@/lib/lineups/media";
import { isLineupMetadata } from "@/lib/lineups/metadata";

export type LineupRow = FunctionReturnType<
  typeof api.lineups.listPublicFeedPage
>["page"][number];
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isImages(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= MAX_LINEUP_IMAGES &&
    value.every(
      (image) =>
        isRecord(image) &&
        typeof image.imageUrl === "string" &&
        (image.imageUrl === "" || isSafeSourceUrl(image.imageUrl)) &&
        typeof image.caption === "string" &&
        image.caption.length <= 2000 &&
        ["storageId", "imageAssetId"].every(
          (key) => image[key] === undefined || typeof image[key] === "string",
        ),
    )
  );
}
function isSource(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    isSafeSourceUrl(value.url) &&
    (value.embedUrl === undefined ||
      (typeof value.embedUrl === "string" &&
        Boolean(getTrackerEmbedUrl(value.url, value.embedUrl)))) &&
    ["author", "patch", "evidence", "rightsBasis"].every(
      (key) => typeof value[key] === "string",
    ) &&
    (value.publishedAt === undefined ||
      typeof value.publishedAt === "string") &&
    typeof value.checkedAt === "number" &&
    Number.isFinite(value.checkedAt) &&
    typeof value.testedInGame === "boolean"
  );
}
export function isLineupRows(value: unknown): value is LineupRow[] {
  return (
    Array.isArray(value) &&
    value.every((row: unknown) => {
      if (!isRecord(row)) return false;
      return (
        [
          "_id",
          "ownerTokenIdentifier",
          "title",
          "imageUrl",
          "mapSlug",
          "agentSlug",
          "abilityType",
        ].every((key) => typeof row[key] === "string") &&
        ["_creationTime", "createdAt", "updatedAt"].every(
          (key) => typeof row[key] === "number" && Number.isFinite(row[key]),
        ) &&
        [
          "description",
          "storageId",
          "imageStorageKey",
          "imageAssetId",
          "forkedFromId",
          "legacyId",
        ].every(
          (key) => row[key] === undefined || typeof row[key] === "string",
        ) &&
        typeof row.isPublic === "boolean" &&
        (row.canEdit === undefined || typeof row.canEdit === "boolean") &&
        (row.metadata === undefined || isLineupMetadata(row.metadata)) &&
        (row.images === undefined || isImages(row.images)) &&
        (row.videoUrl === undefined ||
          row.videoUrl === "" ||
          (typeof row.videoUrl === "string" &&
            isSafeSourceUrl(row.videoUrl))) &&
        (row.source === undefined || isSource(row.source)) &&
        (row.coverIndex === undefined ||
          (typeof row.coverIndex === "number" &&
            Number.isInteger(row.coverIndex) &&
            row.coverIndex >= 0 &&
            Array.isArray(row.images) &&
            row.coverIndex < Math.max(1, row.images.length)))
      );
    })
  );
}

export function useLineups(mapSlug: string, agentSlug: string) {
  const { signedIn } = useAppSession();
  const { isAuthenticated } = useConvexAuth();
  const connection = useCollectionConnection();
  const { online } = connection;
  const ready = !signedIn || isAuthenticated;
  const args = { mapSlug, agentSlug };
  const published = usePaginatedQuery(
    api.lineups.listPublicByMapAgentPage,
    ready ? args : "skip",
    { initialNumItems: 48 },
  );
  const owned = usePaginatedQuery(
    api.lineups.listOwnedByMapAgentPage,
    ready && signedIn ? args : "skip",
    { initialNumItems: 48 },
  );
  const loading =
    !ready ||
    published.status === "LoadingFirstPage" ||
    (signedIn && owned.status === "LoadingFirstPage");
  const live = useMemo(
    () =>
      loading
        ? undefined
        : [
            ...new Map(
              [
                ...published.results,
                ...(signedIn && isAuthenticated ? owned.results : []),
              ].map((row) => [row._id, row]),
            ).values(),
          ].sort((a, b) => b.createdAt - a.createdAt),
    [loading, published.results, owned.results, signedIn, isAuthenticated],
  );
  const rows = usePersistedValue(
    `lineups:${mapSlug}:${agentSlug}`,
    live,
    signedIn,
    isLineupRows,
  );
  return {
    rows,
    online,
    unavailable: connection.unavailable,
    loading: rows === undefined,
    canLoadMore:
      online &&
      connection.isWebSocketConnected &&
      (published.status === "CanLoadMore" ||
        (signedIn && owned.status === "CanLoadMore")),
    loadingMore:
      published.status === "LoadingMore" || owned.status === "LoadingMore",
    loadMore() {
      if (published.status === "CanLoadMore") published.loadMore(48);
      if (signedIn && owned.status === "CanLoadMore") owned.loadMore(48);
    },
  };
}
