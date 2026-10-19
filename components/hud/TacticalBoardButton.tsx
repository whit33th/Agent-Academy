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

export default function TacticalBoardButton({ map, compact = false }: TacticalBoardButtonProps & { compact?: boolean }) {
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
        className={compact
          ? "flex h-full items-center gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-val-teal/75 transition-colors hover:bg-white/8 hover:text-val-teal"
          : "group relative flex items-center gap-2 px-3.5 py-1.5 h-9 bg-val-teal/5 hover:bg-val-teal/15 border border-val-teal/20 hover:border-val-teal/60 text-val-teal/70 hover:text-val-teal text-[11px] font-bold uppercase tracking-[0.15em] transition-[background-color,border-color,color,transform] cursor-pointer active:scale-95 clip-angular-sm overflow-hidden"}
      >
        {compact ? null : (
          <>
            <span aria-hidden className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-val-teal/60 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-val-teal/40 to-transparent" />
            </span>
            <span aria-hidden className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-[inset_0_0_12px_rgba(0,243,255,0.06)] pointer-events-none" />
          </>
        )}
        <Map size={14} className="relative z-10 shrink-0" />
        <span className={compact ? "titlebar-board-label relative z-10" : "relative z-10"}>Board</span>
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
