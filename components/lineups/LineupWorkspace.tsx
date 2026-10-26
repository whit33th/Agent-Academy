"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { LazyMotion, domAnimation, LayoutGroup } from "framer-motion";
import { Plus, Star } from "lucide-react";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import {
  EMPTY_METADATA,
  SITE_LABELS,
  type SideFilter,
  type SiteFilter,
  type LineupAbility,
} from "@/lib/lineups/metadata";
import { getPlantSites } from "@/lib/catalog/lineup-options";
import { accentFromGradient } from "@/lib/utils/color";
import {
  getFavoriteSetupsServerSnapshot,
  getFavoriteSetupsSnapshot,
  subscribeFavoriteSetups,
  toggleFavoriteSetup,
} from "@/lib/utils/favorites";
import {
  getStoredMapSide,
  setStoredMapSide,
  subscribeMapSide,
} from "@/lib/utils/map-side-preference";
import AgentInfoPanel from "./AgentInfoPanel";
import SideTabs from "./SideTabs";
import LineupCard from "./LineupCard";
import LineupEmptyState from "./LineupEmptyState";
import { markStep3Eligible } from "@/lib/onboarding/state";
import { useOnboardingStep3Active } from "@/components/onboarding/useOnboarding";
import { useAppSession } from "@/components/auth/SessionProvider";

import { useLineups } from "@/lib/collection/useLineups";
import { filterLineups } from "@/lib/collection/lineup-filters";
import LineupDialogs from "./LineupDialogs";
import CollectionBoundary from "@/components/collection/CollectionBoundary";
import CollectionStatus from "@/components/collection/CollectionStatus";
import SelectField from "@/components/ui/SelectField";
import LineupGridSkeleton, {
  LINEUP_GRID_CLASS,
} from "@/components/collection/LineupGridSkeleton";

interface LineupWorkspaceProps {
  agent: Agent;
  map: GameMap;
}

function PersonalLineupWorkspace({ agent, map }: LineupWorkspaceProps) {
  const { signedIn } = useAppSession();
  const collection = useLineups(map._id, agent.slug!.current);
  const screenshots: Screenshot[] = (collection.rows ?? []).map((row) => ({
    _id: row._id,
    title: row.title,
    description: row.description ?? null,
    metadata: row.metadata ?? EMPTY_METADATA,
    image: row.imageUrl,
    images: row.images,
    coverIndex: row.coverIndex,
    videoUrl: row.videoUrl,
    source: row.source,
    map: {
      name: map.name,
      displayIcon: map.displayIcon,
      imageUrl: map.imageUrl,
    },
    agent: { name: agent.name, displayIcon: agent.displayIcon },
    isPublic: row.isPublic,
    canEdit: Boolean(signedIn && row.canEdit),
  }));

  const side = useSyncExternalStore(
    subscribeMapSide,
    () => getStoredMapSide(map._id) ?? "all",
    (): SideFilter => "all",
  );
  const [abilitySlot, setAbilitySlot] = useState<"all" | LineupAbility>("all");
  const [site, setSite] = useState<SiteFilter>("all");
  const sites = getPlantSites(map._id);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [actionsTarget, setActionsTarget] = useState<Screenshot | null>(null);
  const [editTarget, setEditTarget] = useState<Screenshot | null>(null);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favoriteKey = useSyncExternalStore(
    subscribeFavoriteSetups,
    getFavoriteSetupsSnapshot,
    getFavoriteSetupsServerSnapshot,
  );
  const favoriteIds = useMemo(
    () => new Set(favoriteKey ? favoriteKey.split("\n") : []),
    [favoriteKey],
  );
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  const step3Onboarding = useOnboardingStep3Active();

  const accent = accentFromGradient(agent.backgroundGradientColors);

  const openLightbox = (index: number) => {
    markStep3Eligible();
    setLightboxIndex(index);
  };

  const openHotkeys = () => {
    markStep3Eligible();
    setHotkeysOpen(true);
  };
  const abilityFilterActive = abilitySlot !== "all";

  const handleSideChange = (next: SideFilter) =>
    setStoredMapSide(map._id, next);

  const filtered = filterLineups(screenshots, {
    favoritesOnly,
    favoriteIds,
    side,
    ability: abilitySlot,
    site,
  });

  const openRandomLightbox = () => {
    if (filtered.length === 0) return;
    const idx = Math.floor(Math.random() * filtered.length);
    sfx.playClick();
    openLightbox(idx);
  };

  const toggleFavoriteForCurrent = () => {
    if (lightboxIndex !== null && filtered[lightboxIndex]) {
      const id = filtered[lightboxIndex]._id;
      toggleFavoriteSetup(id);
      sfx.playClick();
      return;
    }
    setFavoritesOnly((v) => !v);
    sfx.playClick();
  };

  const onLineupHotkey = useEffectEvent((e: KeyboardEvent) => {
    if (
      e.defaultPrevented ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      document.querySelector("[data-tactical-board]")
    )
      return;
    const tag = e.target instanceof HTMLElement ? e.target.tagName : undefined;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (
      e.target instanceof HTMLElement &&
      e.target.closest(
        '[contenteditable=true], [role="combobox"], [role="listbox"]',
      )
    )
      return;

    const activeDialog =
      e.target instanceof HTMLElement ? e.target.closest("dialog") : null;
    if (
      activeDialog &&
      activeDialog.getAttribute("aria-labelledby") !== "lineup-detail-title"
    )
      return;
    if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
      if (activeDialog) return;
      e.preventDefault();
      openHotkeys();
      return;
    }
    if (hotkeysOpen) return;

    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      toggleFavoriteForCurrent();
    }
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      openRandomLightbox();
    }
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => onLineupHotkey(e);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const emptyVariant =
    screenshots.length === 0 ? "no-setups" : "no-filter-match";

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col">
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          <div className="flex-1 min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <SideTabs value={side} onChange={handleSideChange} />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sfx.playClick();
                    setFavoritesOnly((v) => !v);
                  }}
                  onMouseEnter={() => sfx.playHover()}
                  title="Favorites only (F)"
                  aria-pressed={favoritesOnly}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    favoritesOnly
                      ? "border-val-gold/40 bg-val-gold/10 text-val-gold"
                      : "border-white/5 bg-white/5 text-white/45 hover:text-white"
                  }`}
                >
                  <Star
                    size={12}
                    className={favoritesOnly ? "fill-current" : ""}
                  />
                  <span className="hidden sm:inline">Favorites</span>
                </button>
                <button
                  type="button"
                  data-onboarding="lineup-hotkeys"
                  onClick={() => {
                    sfx.playClick();
                    openHotkeys();
                  }}
                  onMouseEnter={() => sfx.playHover()}
                  title="Keyboard shortcuts (?)"
                  className={`size-8 items-center justify-center rounded-sm border border-white/5 bg-white/5 text-white/40 hover:text-white text-xs font-bold cursor-pointer ${
                    step3Onboarding ? "flex" : "hidden sm:flex"
                  }`}
                >
                  ?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sfx.playClick();
                    setUploadOpen(true);
                  }}
                  onMouseEnter={() => sfx.playHover()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white hover:bg-white/90 text-black text-xs font-bold uppercase tracking-wider transition-[background-color,box-shadow,scale] shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-[1.02] cursor-pointer"
                >
                  <Plus size={14} className="stroke-[3]" />
                  Add Setup
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-white/55">
              <div className="flex items-center gap-2">
                Site{" "}
                <SelectField<SiteFilter>
                  label="Site filter"
                  value={site}
                  onChange={setSite}
                  options={[
                    { value: "all", label: "All sites" },
                    ...sites.map((value) => ({
                      value,
                      label: SITE_LABELS[value],
                    })),
                    { value: "none", label: SITE_LABELS.none },
                    { value: "unspecified", label: SITE_LABELS.unspecified },
                  ]}
                  className="min-w-44"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  handleSideChange("all");
                  setSite("all");
                  setAbilitySlot("all");
                  setFavoritesOnly(false);
                }}
                className="text-white/60 underline"
              >
                Clear filters
              </button>
              {collection.canLoadMore && (
                <span>
                  Filters apply to loaded setups. Load more to include the rest.
                </span>
              )}
            </div>
            <CollectionStatus />
            {collection.loading ? (
              collection.unavailable ? (
                <p className="py-8 text-white/55">
                  No saved setups for this selection. Connect to load your
                  collection.
                </p>
              ) : (
                <LineupGridSkeleton />
              )
            ) : filtered.length > 0 ? (
              <LayoutGroup>
                <div className={LINEUP_GRID_CLASS}>
                  {filtered.map((s, i) => {
                    const card = (
                      <LineupCard
                        screenshot={s}
                        index={i}
                        onLongPress={(s) => {
                          if (s.canEdit) setActionsTarget(s);
                        }}
                        onOpenLightbox={openLightbox}
                        accentColor={accent}
                        abilityFilterActive={abilityFilterActive}
                        isFavorite={favoriteIds.has(s._id)}
                        priority={i === 0}
                      />
                    );
                    return i === 0 ? (
                      <div key={s._id} data-onboarding="lineup-card">
                        {card}
                      </div>
                    ) : (
                      <div key={s._id}>{card}</div>
                    );
                  })}
                </div>
              </LayoutGroup>
            ) : (
              <LineupEmptyState
                variant={emptyVariant}
                favoritesOnly={favoritesOnly}
              />
            )}
            {collection.canLoadMore && (
              <button
                type="button"
                className="mt-4 border border-white/15 px-4 py-2 text-sm text-white"
                disabled={collection.loadingMore}
                onClick={collection.loadMore}
              >
                {collection.loadingMore ? "Loading…" : "Load more setups"}
              </button>
            )}
          </div>

          <AgentInfoPanel
            agent={agent}
            selectedSlot={abilitySlot}
            onSelectAbility={setAbilitySlot}
            accentColor={accent}
            filteredCount={collection.loading ? undefined : filtered.length}
            totalCount={collection.loading ? undefined : screenshots.length}
          />
        </div>

        <LineupDialogs
          filtered={filtered}
          lightboxIndex={lightboxIndex}
          setLightboxIndex={setLightboxIndex}
          hotkeysOpen={hotkeysOpen}
          setHotkeysOpen={setHotkeysOpen}
          isUploadOpen={isUploadOpen}
          setUploadOpen={setUploadOpen}
          agent={agent}
          map={map}
          editTarget={editTarget}
          setEditTarget={setEditTarget}
          actionsTarget={actionsTarget}
          setActionsTarget={setActionsTarget}
        />
      </div>
    </LazyMotion>
  );
}

export default function LineupWorkspace(props: LineupWorkspaceProps) {
  return (
    <CollectionBoundary
      fallback={
        <AgentInfoPanel
          agent={props.agent}
          selectedSlot="all"
          onSelectAbility={() => {}}
          accentColor={accentFromGradient(props.agent.backgroundGradientColors)}
        />
      }
    >
      <PersonalLineupWorkspace
        key={props.map._id + ":" + props.agent._id}
        {...props}
      />
    </CollectionBoundary>
  );
}
