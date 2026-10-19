"use client";

import { m } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { normalizeName } from "@/lib/utils/normalize";
import { useAppSession } from "@/components/auth/SessionProvider";

interface MapCollectionProgressProps {
  /** Agents with at least one lineup on this map. */
  addedAgents: number;
  /** Total playable agents in Valorant (API roster). */
  totalAgentsInGame: number;
  mapName: string;
}

export default function MapCollectionProgress({
  addedAgents: initialAdded,
  totalAgentsInGame,
  mapName,
}: MapCollectionProgressProps) {
  const { ready } = useAppSession();
  const counts = useQuery(api.lineups.countsByMap, ready ? { mapSlug: normalizeName(mapName) } : "skip");
  const addedAgents = counts ? Object.keys(counts).length : initialAdded;
  if (totalAgentsInGame === 0) return null;

  const pct = Math.round((addedAgents / totalAgentsInGame) * 100);
  const complete = addedAgents >= totalAgentsInGame;

  return (
    <div
      className="mt-3 max-w-md"
      role="status"
      aria-label={`${addedAgents} of ${totalAgentsInGame} Valorant agents have lineups on ${mapName}`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/45">
          Collection
        </p>
        <p className="text-xs font-medium text-white/70 tabular-nums">
          <span className={complete ? "text-val-teal" : "text-white"}>
            {addedAgents}
          </span>
          <span className="text-white/30"> / </span>
          <span>{totalAgentsInGame}</span>
          <span className="ml-1.5 text-white/35">agent with lineups</span>
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden clip-angular-sm bg-white/6">
        <m.div
          className="h-full origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: complete
              ? "linear-gradient(90deg, #17e8b4, #5cff8d)"
              : "linear-gradient(90deg, #FF4655, #ff6b76)",
          }}
        />
      </div>
    </div>
  );
}
