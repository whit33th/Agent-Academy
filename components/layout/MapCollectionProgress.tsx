"use client";

import { m } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import { useConvexAuth } from "convex/react";
import { usePersistedValue } from "@/lib/collection/usePersistedValue";
import CollectionBoundary from "@/components/collection/CollectionBoundary";

function isAgentSlugs(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((slug) => typeof slug === "string")
  );
}

interface MapCollectionProgressProps {
  /** Agents with at least one lineup on this map. */
  mapSlug: string;
  /** Total playable agents in Valorant (API roster). */
  totalAgentsInGame: number;
  mapName: string;
}

export default function MapCollectionProgress({
  ...props
}: MapCollectionProgressProps) {
  return (
    <CollectionBoundary fallback={<ProgressView {...props} />}>
      <PersonalProgress {...props} />
    </CollectionBoundary>
  );
}

function PersonalProgress(props: MapCollectionProgressProps) {
  const { signedIn } = useAppSession();
  const { isAuthenticated } = useConvexAuth();
  const result = useQuery(
    api.lineups.collectionProgress,
    !signedIn || isAuthenticated ? { mapSlug: props.mapSlug } : "skip",
  );
  const agents = usePersistedValue(
    `progress:${props.mapSlug}`,
    result,
    signedIn,
    isAgentSlugs,
  );
  return <ProgressView {...props} addedAgents={agents?.length} />;
}

function ProgressView({
  addedAgents,
  totalAgentsInGame,
  mapName,
}: MapCollectionProgressProps & { addedAgents?: number }) {
  if (totalAgentsInGame === 0) return null;

  const pct = Math.round(((addedAgents ?? 0) / totalAgentsInGame) * 100);
  const complete = (addedAgents ?? 0) >= totalAgentsInGame;

  return (
    <div
      className="mt-3 max-w-md"
      role="status"
      aria-label={
        addedAgents === undefined
          ? `Loading collection progress for ${mapName}`
          : `${addedAgents} of ${totalAgentsInGame} Valorant agents have lineups on ${mapName}`
      }
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/45">
          Collection
        </p>
        <p className="text-xs font-medium text-white/70 tabular-nums">
          <span className={complete ? "text-val-teal" : "text-white"}>
            {addedAgents ?? "–"}
          </span>
          <span className="text-white/30"> / </span>
          <span>{totalAgentsInGame}</span>
          <span className="ml-1.5 text-white/35">agents with lineups</span>
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
