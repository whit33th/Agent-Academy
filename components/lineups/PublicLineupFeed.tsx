"use client";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import { usePersistedValue } from "@/lib/collection/usePersistedValue";
import { isLineupRows } from "@/lib/collection/useLineups";
import CollectionBoundary from "@/components/collection/CollectionBoundary";
import CollectionStatus from "@/components/collection/CollectionStatus";
import { useCollectionConnection } from "@/lib/collection/useCollectionConnection";
import LineupGridSkeleton, {
  LINEUP_GRID_CLASS,
} from "@/components/collection/LineupGridSkeleton";
import CopyLineupButton from "./CopyLineupButton";
import LineupImage from "./LineupImage";
import LineupMetadataBadges from "./LineupMetadataBadges";
import PublicFeedEmptyState from "./PublicFeedEmptyState";
export default function PublicLineupFeed() {
  return (
    <CollectionBoundary>
      <PublicFeed />
    </CollectionBoundary>
  );
}
function PublicFeed() {
  const { signedIn } = useAppSession();
  const { isAuthenticated } = useConvexAuth();
  const connection = useCollectionConnection();
  const query = usePaginatedQuery(
    api.lineups.listPublicFeedPage,
    !signedIn || isAuthenticated ? {} : "skip",
    { initialNumItems: 48 },
  );
  const rows = usePersistedValue(
    "public-feed",
    query.status === "LoadingFirstPage" ? undefined : query.results,
    signedIn,
    isLineupRows,
  );
  if (!rows)
    return (
      <>
        <CollectionStatus />
        {!connection.unavailable ? (
          <LineupGridSkeleton feed />
        ) : (
          <p className="py-8 text-white/55">
            Connect to load public setups for the first time.
          </p>
        )}
      </>
    );
  if (!rows.length)
    return (
      <>
        <CollectionStatus />
        <PublicFeedEmptyState />
      </>
    );
  return (
    <>
      <CollectionStatus />
      <section className={LINEUP_GRID_CLASS}>
        {rows.map((l, i) => (
          <article
            key={l._id}
            className="val-card group relative block w-full clip-angular bg-val-surface text-left overflow-hidden border border-white/5"
          >
            <div className="relative aspect-video bg-black/30">
              <LineupMetadataBadges metadata={l.metadata} />
              {l.imageUrl ? (
                <LineupImage
                  src={l.imageUrl}
                  alt={l.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={i < 2}
                />
              ) : null}
            </div>
            <div className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {l.title}
                </p>
                <p className="mt-1 text-[11px] text-white/35 font-mono uppercase tracking-wider truncate">
                  {l.mapSlug} / {l.agentSlug}
                </p>
              </div>
              <CopyLineupButton
                id={l._id}
                mapSlug={l.mapSlug}
                agentSlug={l.agentSlug}
              />
            </div>
          </article>
        ))}
      </section>
      {connection.isWebSocketConnected && query.status === "CanLoadMore" && (
        <button
          type="button"
          className="mt-4 border border-white/15 px-4 py-2 text-sm text-white"
          onClick={() => query.loadMore(48)}
        >
          Load more setups
        </button>
      )}
    </>
  );
}
