"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import { audio } from "@/lib/audio";
import { getAgents } from "@/lib/catalog/catalog";
import type { GameMap } from "@/lib/types";

const TacticalBoard = dynamic(
  () => import("@/components/tactical-board/TacticalBoard"),
  {
    ssr: false,
  },
);

interface TacticalBoardButtonProps {
  map: GameMap;
}
function subscribeUrl(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
function sharedBoardSnapshot() {
  return new URLSearchParams(window.location.search).get("strat");
}

export default function TacticalBoardButton({ map }: TacticalBoardButtonProps) {
  const agents = getAgents();
  const [isOpen, setIsOpen] = useState(false);
  const initialStateStr = useSyncExternalStore(
    subscribeUrl,
    sharedBoardSnapshot,
    () => null,
  );

  const handleClose = () => {
    setIsOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("strat");
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          audio.playClick();
          setIsOpen(true);
        }}
        onMouseEnter={() => audio.playHover()}
        aria-label="Board"
        className="ml-auto inline-flex h-10 shrink-0 cursor-pointer items-center gap-2.5 border border-white/10 bg-white/4 pl-2.5 pr-3.5 text-val-cream/80 clip-angular-sm transition-colors hover:border-white/22 hover:bg-white/8 hover:text-white"
      >
        <Map size={15} className="shrink-0 text-val-teal" />
        <span className="font-oswald text-xs font-semibold uppercase tracking-[0.16em]">
          Board
        </span>
      </button>

      {(isOpen || initialStateStr) && (
        <TacticalBoard
          map={map}
          allAgents={agents}
          initialStateStr={initialStateStr ?? undefined}
          onClose={handleClose}
        />
      )}
    </>
  );
}
