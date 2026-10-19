"use client";

import {
  useCallback,
  useEffect,
  useOptimistic,
  useState,
} from "react";
import { LazyMotion, domAnimation, LayoutGroup } from "framer-motion";
import { Plus, Star } from "lucide-react";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import { matchScreenshotToAbility } from "@/lib/utils/ability";
import { accentFromGradient } from "@/lib/utils/color";
import {
  getFavoriteSetupIds,
  toggleFavoriteSetup,
} from "@/lib/utils/favorites";
import {
  getStoredMapSide,
  setStoredMapSide,
} from "@/lib/utils/map-side-preference";
import AgentInfoPanel from "./AgentInfoPanel";
import SideTabs, { type SideKey } from "./SideTabs";
import ScreenshotCard from "./ScreenshotCard";
import ScreenshotLightbox from "./ScreenshotLightbox";
import UploadScreenshotModal from "./UploadScreenshotModal";
import EditScreenshotModal from "./EditScreenshotModal";
import ScreenshotActionsModal from "./ScreenshotActionsModal";
import LineupEmptyState from "./LineupEmptyState";
import LineupHotkeysHelp from "./LineupHotkeysHelp";
import { markStep3Eligible } from "@/lib/onboarding/state";
import { useOnboardingStep3Active } from "@/components/onboarding/useOnboarding";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";

type Action =
  | { type: "add"; screenshot: Screenshot }
  | { type: "remove"; id: string }
  | { type: "update"; screenshot: Screenshot };

function reducer(state: Screenshot[], action: Action): Screenshot[] {
  switch (action.type) {
    case "add":
      return [...state, action.screenshot];
    case "remove":
      return state.filter((s) => s._id !== action.id);
    case "update":
      return state.map((s) =>
        s._id === action.screenshot._id ? action.screenshot : s,
      );
  }
}

interface LineupViewerProps {
  screenshots: Screenshot[];
  agent: Agent;
  map: GameMap;
}

export default function LineupViewer({
  screenshots: initialScreenshots,
  agent,
  map,
}: LineupViewerProps) {
  const { ready, signedIn, subject } = useAppSession();
  const rows = useQuery(api.lineups.listByMapAgent, ready ? { mapSlug: map.slug?.current ?? map._id, agentSlug: agent.slug?.current ?? agent._id } : "skip");
  const screenshots: Screenshot[] = rows ? rows.filter(row => row.isPublic || (signedIn && row.ownerTokenIdentifier.endsWith(`|${subject}`))).map(row => ({ _id: row._id, title: row.title, description: row.description ?? null, abilityType: row.abilityType, image: row.imageUrl, isPublic: row.isPublic, canEdit: signedIn && row.ownerTokenIdentifier.endsWith(`|${subject}`) })) : initialScreenshots;
  const [optimistic, applyOptimistic] = useOptimistic(screenshots, reducer);

  const [side, setSide] = useState<SideKey>("all");
  const [abilityIdx, setAbilityIdx] = useState<number>(-1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [actionsTarget, setActionsTarget] = useState<Screenshot | null>(null);
  const [editTarget, setEditTarget] = useState<Screenshot | null>(null);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [hotkeysOpen, setHotkeysOpen] = useState(false);
  const step3Onboarding = useOnboardingStep3Active();

  const accent = accentFromGradient(agent.backgroundGradientColors);

  const openLightbox = useCallback((index: number) => {
    markStep3Eligible();
    setLightboxIndex(index);
  }, []);

  const openHotkeys = useCallback(() => {
    markStep3Eligible();
    setHotkeysOpen(true);
  }, []);
  const abilityFilterActive = abilityIdx !== -1;
  const selectedAbility =
    abilityIdx !== -1 ? agent.abilities[abilityIdx] : null;

  useEffect(() => {
    const stored = getStoredMapSide(map._id);
    if (stored) setSide(stored);
    setFavoriteIds(getFavoriteSetupIds());
  }, [map._id]);

  const handleSideChange = useCallback(
    (next: SideKey) => {
      setSide(next);
      setStoredMapSide(map._id, next);
    },
    [map._id],
  );

  const refreshFavorites = useCallback(() => {
    setFavoriteIds(getFavoriteSetupIds());
  }, []);

  const filtered = optimistic.filter((s) => {
    if (favoritesOnly && !favoriteIds.has(s._id)) return false;
    if (side !== "all") {
      const t = s.title.toLowerCase();
      const isAtk = t.includes("atk") || t.includes("attack");
      const isDef =
        t.includes("def") || t.includes("defense") || t.includes("retake");
      if (side === "atk" && !isAtk) return false;
      if (side === "def" && !isDef) return false;
    }
    if (abilityIdx !== -1) {
      const ability = agent.abilities[abilityIdx];
      if (!ability) return true;
      return matchScreenshotToAbility(s, ability, agent.name);
    }
    return true;
  });

  const openRandomLightbox = useCallback(() => {
    if (filtered.length === 0) return;
    const idx = Math.floor(Math.random() * filtered.length);
    sfx.playClick();
    openLightbox(idx);
  }, [filtered.length, openLightbox]);

  const toggleFavoriteForCurrent = useCallback(() => {
    if (lightboxIndex !== null && filtered[lightboxIndex]) {
      const id = filtered[lightboxIndex]._id;
      toggleFavoriteSetup(id);
      refreshFavorites();
      sfx.playClick();
      return;
    }
    setFavoritesOnly((v) => !v);
    sfx.playClick();
  }, [lightboxIndex, filtered, refreshFavorites]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
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
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeysOpen, toggleFavoriteForCurrent, openRandomLightbox, openHotkeys]);

  const emptyVariant =
    optimistic.length === 0 ? "no-setups" : "no-filter-match";

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
                <span className="text-xs text-white/35 font-medium hidden md:block">
                  Showing {filtered.length} of {optimistic.length} setups
                </span>
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

            {filtered.length > 0 ? (
              <LayoutGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((s, i) => {
                    const abilityMatch =
                      !selectedAbility ||
                      matchScreenshotToAbility(
                        s,
                        selectedAbility,
                        agent.name,
                      );
                    const card = (
                      <ScreenshotCard
                        screenshot={s}
                        index={i}
              onLongPress={(s) => { if (s.canEdit !== false) setActionsTarget(s); }}
                        onOpenLightbox={openLightbox}
                        accentColor={accent}
                        abilityFilterActive={abilityFilterActive}
                        abilityMatch={abilityMatch}
                        isFavorite={favoriteIds.has(s._id)}
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
                agent={agent}
                accentColor={accent}
                variant={emptyVariant}
                favoritesOnly={favoritesOnly}
                onAddSetup={() => setUploadOpen(true)}
              />
            )}
          </div>

          <AgentInfoPanel
            agent={agent}
            selectedAbilityIdx={abilityIdx}
            onSelectAbility={setAbilityIdx}
            accentColor={accent}
            filteredCount={filtered.length}
            totalCount={optimistic.length}
          />
        </div>

        <ScreenshotLightbox
          screenshots={filtered}
          currentIndex={lightboxIndex ?? 0}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          onNext={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev + 1) % filtered.length : 0,
            )
          }
          onPrev={() =>
            setLightboxIndex((prev) =>
              prev !== null
                ? (prev - 1 + filtered.length) % filtered.length
                : 0,
            )
          }
        />

        <LineupHotkeysHelp
          open={hotkeysOpen}
          onClose={() => setHotkeysOpen(false)}
        />

        <UploadScreenshotModal
          open={isUploadOpen}
          agent={agent}
          map={map}
          onClose={() => setUploadOpen(false)}
          applyOptimistic={(s) =>
            applyOptimistic({ type: "add", screenshot: s })
          }
        />

        <EditScreenshotModal
          screenshot={editTarget}
          agent={agent}
          onClose={() => setEditTarget(null)}
          applyOptimistic={(s) =>
            applyOptimistic({ type: "update", screenshot: s })
          }
        />

        <ScreenshotActionsModal
          screenshot={actionsTarget}
          onClose={() => setActionsTarget(null)}
          onEdit={(s) => setEditTarget(s)}
          applyOptimisticDelete={(id) =>
            applyOptimistic({ type: "remove", id })
          }
        />
      </div>
    </LazyMotion>
  );
}
