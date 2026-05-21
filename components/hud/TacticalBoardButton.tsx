"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Crosshair } from "lucide-react";
import { audio } from "@/lib/audio";
import type { GameMap, Agent } from "@/lib/types";

const TacticalBoard = dynamic(
  () => import("@/components/TacticalBoard"),
  { ssr: false },
);

interface TacticalBoardButtonProps {
  map: GameMap;
  allAgents: Agent[];
}

export default function TacticalBoardButton({ map, allAgents }: TacticalBoardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialStateStr, setInitialStateStr] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const strat = params.get("strat");
    if (strat) {
      setInitialStateStr(strat);
      setIsOpen(true);
    }
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
          setIsOpen(true);
        }}
        onMouseEnter={() => audio.playHover()}
        className="group relative flex items-center gap-2 px-3.5 py-1.5 bg-val-teal/5 hover:bg-val-teal/15 border border-val-teal/20 hover:border-val-teal/60 text-val-teal/70 hover:text-val-teal text-[11px] font-bold uppercase tracking-[0.15em] transition-all cursor-pointer active:scale-95 clip-angular-sm overflow-hidden"
      >
        <span aria-hidden className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-val-teal/60 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-val-teal/40 to-transparent" />
        </span>
        <span aria-hidden className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-[inset_0_0_12px_rgba(0,243,255,0.06)] pointer-events-none" />
        <Crosshair
          size={14}
          className="relative z-10 transition-transform group-hover:rotate-90 duration-300"
        />
        <span className="relative z-10">Strat Board</span>
      </button>

      {isOpen && (
        <TacticalBoard
          map={map}
          allAgents={allAgents}
          initialStateStr={initialStateStr}
          onClose={handleClose}
        />
      )}
    </>
  );
}
