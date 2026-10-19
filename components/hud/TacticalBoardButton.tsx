"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import { audio } from "@/lib/audio";
import { loadBoardAgents } from "@/app/_actions/board-agents";
import type { GameMap, Agent } from "@/lib/types";

const TacticalBoard = dynamic(() => import("@/components/TacticalBoard"), {
  ssr: false,
});

interface TacticalBoardButtonProps {
  map: GameMap;
}

export default function TacticalBoardButton({ map }: TacticalBoardButtonProps) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [initialStateStr, setInitialStateStr] = useState<string | undefined>();

  async function openBoard(strat?: string) {
    const list = agents ?? (await loadBoardAgents());
    setAgents(list);
    if (strat) setInitialStateStr(strat);
    setIsOpen(true);
  }

  useEffect(() => {
    const strat = new URLSearchParams(window.location.search).get("strat");
    if (!strat) return;
    let cancelled = false;
    void loadBoardAgents().then((list) => {
      if (cancelled) return;
      setAgents(list);
      setInitialStateStr(strat);
      setIsOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setInitialStateStr(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete("strat");
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          audio.playClick();
          void openBoard();
        }}
        onMouseEnter={() => audio.playHover()}
        aria-label="Board"
        className="ml-auto inline-flex h-10 shrink-0 cursor-pointer items-center gap-2.5 border border-white/10 bg-white/4 pl-2.5 pr-3.5 text-val-cream/80 clip-angular-sm transition-colors hover:border-white/22 hover:bg-white/8 hover:text-white"
      >
        <Map size={15} className="shrink-0 text-val-teal" />
        <span className="font-oswald text-xs font-semibold uppercase tracking-[0.16em]">Board</span>
      </button>

      {isOpen && agents && (
        <TacticalBoard
          map={map}
          allAgents={agents}
          initialStateStr={initialStateStr}
          onClose={handleClose}
        />
      )}
    </>
  );
}
