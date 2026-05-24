"use client";

import { useOptimistic, useState, useTransition } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { Plus } from "lucide-react";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import { matchScreenshotToAbility } from "@/lib/utils/ability";
import { accentFromGradient } from "@/lib/utils/color";
import AgentInfoPanel from "./AgentInfoPanel";
import SideTabs, { type SideKey } from "./SideTabs";
import ScreenshotCard from "./ScreenshotCard";
import ScreenshotLightbox from "./ScreenshotLightbox";
import UploadScreenshotModal from "./UploadScreenshotModal";
import EditScreenshotModal from "./EditScreenshotModal";
import ScreenshotActionsModal from "./ScreenshotActionsModal";

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
  screenshots,
  agent,
  map,
}: LineupViewerProps) {
  const [optimistic, applyOptimistic] = useOptimistic(screenshots, reducer);
  const [, startTransition] = useTransition();

  const [side, setSide] = useState<SideKey>("all");
  const [abilityIdx, setAbilityIdx] = useState<number>(-1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [actionsTarget, setActionsTarget] = useState<Screenshot | null>(null);
  const [editTarget, setEditTarget] = useState<Screenshot | null>(null);
  const [isUploadOpen, setUploadOpen] = useState(false);

  const accent = accentFromGradient(agent.backgroundGradientColors);

  const filtered = optimistic.filter((s) => {
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

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col">
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          <div className="flex-1 min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <SideTabs value={side} onChange={setSide} />
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/35 font-medium hidden sm:block">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((s, i) => (
                  <ScreenshotCard
                    key={s._id}
                    screenshot={s}
                    index={i}
                    onLongPress={setActionsTarget}
                    onOpenLightbox={setLightboxIndex}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center py-20 text-center">
                <div className="mb-4 flex size-16 items-center justify-center clip-diamond bg-white/4">
                  <span className="text-2xl text-white/20">?</span>
                </div>
                <p className="text-sm font-medium text-white/40">
                  No matching setups found.
                </p>
                <p className="mt-1 text-xs text-white/20">
                  Try changing your filters or adding screenshots.
                </p>
              </div>
            )}
          </div>

          <AgentInfoPanel
            agent={agent}
            selectedAbilityIdx={abilityIdx}
            onSelectAbility={setAbilityIdx}
            accentColor={accent}
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
