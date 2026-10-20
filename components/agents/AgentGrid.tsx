"use client";
import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import { usePersistedValue } from "@/lib/collection/usePersistedValue";
import { sortAgentsByViability, getViabilityTier } from "@/lib/utils/viability";
import type { Agent } from "@/lib/types";
import CollectionBoundary from "@/components/collection/CollectionBoundary";
import CollectionStatus from "@/components/collection/CollectionStatus";
import AgentCard from "./AgentCard";
import AddAgentCard from "./AddAgentCard";
import RestoreAgentDialog from "./RestoreAgentDialog";
import AgentSettingsDialog from "./AgentSettingsDialog";
import { selectedAgents } from "@/lib/collection/selection";
import { useGuestSelection } from "@/lib/collection/guest-selection";
type Roster = FunctionReturnType<typeof api.mapRoster.listByMap>;
const emptyRoster: Roster = [];
function isRoster(value: unknown): value is Roster {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row &&
        typeof row.agentSlug === "string" &&
        typeof row.mapSlug === "string",
    )
  );
}
export default function AgentGrid({
  agents,
  mapSlug,
}: {
  agents: Agent[];
  mapSlug: string;
}) {
  return (
    <CollectionBoundary
      fallback={
        <AgentSelection agents={agents} visible={[]} mapSlug={mapSlug} />
      }
    >
      <PersonalAgentSelection agents={agents} mapSlug={mapSlug} />
    </CollectionBoundary>
  );
}
function PersonalAgentSelection({
  agents,
  mapSlug,
}: {
  agents: Agent[];
  mapSlug: string;
}) {
  const { signedIn } = useAppSession();
  const guest = useGuestSelection();
  const { isAuthenticated } = useConvexAuth();
  const result = useQuery(
    api.mapRoster.listByMap,
    signedIn && isAuthenticated ? { mapSlug } : "skip",
  );
  const roster = usePersistedValue(
    "roster:" + mapSlug,
    signedIn ? result : emptyRoster,
    signedIn,
    isRoster,
  );
  const preferences = selectedAgents(
    signedIn
      ? (roster ?? [])
      : guest.roster.filter((row) => row.mapSlug === mapSlug),
  );
  const visible = agents.flatMap((agent) => {
    const preference = preferences.get(agent.slug!.current);
    if (!preference) return [];
    return [
      {
        ...agent,
        viability: getViabilityTier(preference?.viability) ?? agent.viability,
      },
    ];
  });
  return (
    <>
      <AgentSelection agents={agents} visible={visible} mapSlug={mapSlug} />
      {signedIn && <CollectionStatus />}
    </>
  );
}
function AgentSelection({
  agents,
  visible,
  mapSlug,
}: {
  agents: Agent[];
  visible: Agent[];
  mapSlug: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [target, setTarget] = useState<Agent | null>(null);
  return (
    <>
      <section className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {sortAgentsByViability(visible).map((agent, index) => (
          <AgentCard
            key={agent._id}
            agent={agent}
            mapSlug={mapSlug}
            onLongPress={setTarget}
            priority={index < 4}
          />
        ))}
        {visible.length < agents.length && (
          <AddAgentCard onClick={() => setAddOpen(true)} />
        )}
      </section>
      <RestoreAgentDialog
        open={addOpen}
        allAgents={agents}
        addedAgents={visible}
        mapSlug={mapSlug}
        onClose={() => setAddOpen(false)}
      />
      <AgentSettingsDialog
        key={target?._id ?? "closed"}
        agent={target}
        mapId={mapSlug}
        onClose={() => setTarget(null)}
      />
    </>
  );
}
