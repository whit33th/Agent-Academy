"use client";

import { useMemo } from "react";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import { usePersistedValue } from "./usePersistedValue";
import { useCollectionConnection } from "./useCollectionConnection";
import { isLineupMetadata } from "@/lib/lineups/metadata";

export type LineupRow = FunctionReturnType<
  typeof api.lineups.listPublicFeedPage
>["page"][number];
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
        (row.metadata === undefined || isLineupMetadata(row.metadata))
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
