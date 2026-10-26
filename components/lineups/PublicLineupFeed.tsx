"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { Screenshot } from "@/lib/types";
const LineupLightbox = dynamic(() => import("./LineupLightbox"));
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
import LineupVideoCover from "./LineupVideoCover";
import LineupMetadataBadges from "./LineupMetadataBadges";
import LineupContextLabel from "./LineupContextLabel";
import PublicFeedEmptyState from "./PublicFeedEmptyState";
import SelectField from "@/components/ui/SelectField";
import { getAgents, getMaps, findAgent, findMap } from "@/lib/catalog/catalog";
import { LINEUP_BASELINE } from "@/lib/lineups/competitive-pool";
import { getSlotKey } from "@/lib/utils/ability";
import { RotateCcw } from "lucide-react";
export default function PublicLineupFeed() {
  return (
    <CollectionBoundary>
      <PublicFeed />
    </CollectionBoundary>
  );
}
interface FeedFilters {
  mapSlug: string;
  agentSlug: string;
  abilitySlot: string;
}
const DEFAULT_FILTERS: FeedFilters = {
  mapSlug: "all",
  agentSlug: "all",
  abilitySlot: "all",
};
function PublicFeed() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const selectedAgent = findAgent(filters.agentSlug);
  const active = Object.values(filters).some((value) => value !== "all");
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-white/5 pb-4">
        <SelectField
          label="Map filter"
          value={filters.mapSlug}
          onChange={(mapSlug) =>
            setFilters((current) => ({ ...current, mapSlug }))
          }
          options={[
            { value: "all", label: "All maps" },
            ...getMaps()
              .filter((map) =>
                (LINEUP_BASELINE.maps as readonly string[]).includes(map._id),
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((map) => ({ value: map._id, label: map.name })),
          ]}
          className="w-full sm:w-44"
        />
        <SelectField
          label="Agent filter"
          value={filters.agentSlug}
          onChange={(agentSlug) =>
            setFilters((current) => ({
              ...current,
              agentSlug,
              abilitySlot: "all",
            }))
          }
          options={[
            { value: "all", label: "All agents" },
            ...getAgents().map((agent) => ({
              value: agent.slug!.current,
              label: agent.name,
              icon: agent.displayIcon ?? undefined,
            })),
          ]}
          className="w-full sm:w-48"
        />
        {selectedAgent ? (
          <SelectField
            label="Ability filter"
            value={filters.abilitySlot}
            onChange={(abilitySlot) =>
              setFilters((current) => ({ ...current, abilitySlot }))
            }
            options={[
              { value: "all", label: "All abilities" },
              ...selectedAgent.abilities.map((ability) => ({
                value: ability.slot,
                label: `${getSlotKey(ability.slot)} · ${ability.displayName}`,
                icon: ability.displayIcon ?? undefined,
              })),
            ]}
            className="w-full sm:w-56"
          />
        ) : null}
        {active ? (
          <button
            type="button"
            aria-label="Clear filters"
            title="Clear filters"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="flex size-10 shrink-0 items-center justify-center clip-angular-sm bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
          >
            <RotateCcw size={16} />
          </button>
        ) : null}
      </div>
      <FilteredFeed
        key={`${filters.mapSlug}:${filters.agentSlug}:${filters.abilitySlot}`}
        filters={filters}
      />
    </>
  );
}
function FilteredFeed({ filters }: { filters: FeedFilters }) {
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const { signedIn } = useAppSession();
  const { isAuthenticated } = useConvexAuth();
  const connection = useCollectionConnection();
  const query = usePaginatedQuery(
    api.lineups.listPublicFeedPage,
    !signedIn || isAuthenticated
      ? {
          ...(filters.mapSlug !== "all" ? { mapSlug: filters.mapSlug } : {}),
          ...(filters.agentSlug !== "all"
            ? { agentSlug: filters.agentSlug }
            : {}),
          ...(filters.abilitySlot !== "all"
            ? { abilitySlot: filters.abilitySlot }
            : {}),
        }
      : "skip",
    { initialNumItems: 48 },
  );
  const rows = usePersistedValue(
    Object.values(filters).every((value) => value === "all")
      ? "public-feed"
      : `public-feed:${filters.mapSlug}:${filters.agentSlug}:${filters.abilitySlot}`,
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
        {Object.values(filters).some((value) => value !== "all") ? (
          <p className="py-12 text-center text-sm text-white/45">
            No setups match these filters.
          </p>
        ) : (
          <PublicFeedEmptyState />
        )}
      </>
    );
  return (
    <>
      <CollectionStatus />
      {detailIndex !== null ? (
        <LineupLightbox
          screenshots={rows.map((row): Screenshot => ({
            _id: row._id,
            title: row.title,
            image: row.imageUrl,
            description: row.description ?? null,
            images: row.images,
            coverIndex: row.coverIndex,
            videoUrl: row.videoUrl,
            source: row.source,
            metadata: row.metadata,
            map: findMap(row.mapSlug) ?? { name: row.mapSlug },
            agent: findAgent(row.agentSlug) ?? { name: row.agentSlug },
          }))}
          currentIndex={Math.min(detailIndex, rows.length - 1)}
          isOpen
          onClose={() => setDetailIndex(null)}
          onNext={() =>
            setDetailIndex((value) => ((value ?? 0) + 1) % rows.length)
          }
          onPrev={() =>
            setDetailIndex(
              (value) => ((value ?? 0) + rows.length - 1) % rows.length,
            )
          }
        />
      ) : null}
      <section className={LINEUP_GRID_CLASS}>
        {rows.map((l, i) => (
          <article
            key={l._id}
            className="val-card group relative block w-full clip-angular bg-val-surface text-left overflow-hidden border border-white/5"
          >
            <button
              type="button"
              onClick={() => setDetailIndex(i)}
              aria-label={`View ${l.title}`}
              className="relative block w-full aspect-video bg-black/30"
            >
              <LineupMetadataBadges metadata={l.metadata} />
              {(l.images?.length ?? 0) > 1 ? (
                <span className="absolute bottom-2 right-2 z-10 bg-black/80 px-2 py-1 text-xs text-white/80">
                  {l.images!.length} images
                </span>
              ) : null}
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
              {!l.imageUrl ? (
                <LineupVideoCover
                  map={l.mapSlug}
                  videoUrl={l.videoUrl}
                  priority={i < 2}
                />
              ) : null}
            </button>
            <div className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  <button type="button" onClick={() => setDetailIndex(i)}>
                    {l.title}
                  </button>
                </p>
                <div className="mt-1">
                  <LineupContextLabel
                    map={findMap(l.mapSlug) ?? { name: l.mapSlug }}
                    agent={findAgent(l.agentSlug) ?? { name: l.agentSlug }}
                    compact
                  />
                </div>
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
          className="mt-4 clip-angular-sm border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/65 transition-colors hover:bg-white/10 hover:text-white"
          onClick={() => query.loadMore(48)}
        >
          Load more setups
        </button>
      )}
    </>
  );
}
