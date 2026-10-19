"use client";

import { useOptimistic, useState } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import type { Agent } from "@/lib/types";
import type { ValorantAgent } from "@/lib/valorant-api";
import { sortAgentsByViability } from "@/lib/utils/viability";
import { toSlug } from "@/lib/utils/normalize";
import AgentCard from "./AgentCard";
import AddAgentCard from "./AddAgentCard";
import AddAgentModal from "./AddAgentModal";
import AgentActionsModal from "./AgentActionsModal";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";

type Action =
  | { type: "add"; agent: Agent }
  | { type: "remove"; agentId: string }
  | { type: "viability"; agentId: string; viability: string | null };

function reducer(state: Agent[], action: Action): Agent[] {
  switch (action.type) {
    case "add":
      return [...state, action.agent];
    case "remove":
      return state.filter((a) => a._id !== action.agentId);
    case "viability":
      return state.map((a) =>
        a._id === action.agentId ? { ...a, viability: action.viability } : a,
      );
  }
}

function makeOptimisticAgent(api: ValorantAgent): Agent {
  return {
    _id: `optimistic-${Date.now()}`,
    slug: { current: toSlug(api.displayName) },
    name: api.displayName,
    roleName: api.role?.displayName ?? "",
    roleIcon: api.role?.displayIcon ?? null,
    imageUrl: api.fullPortrait ?? api.displayIcon ?? null,
    fullPortraitV2: api.fullPortraitV2 ?? null,
    bustPortrait: api.bustPortrait ?? null,
    displayIcon: api.displayIcon ?? null,
    background: api.background ?? null,
    artBackground: null,
    backgroundGradientColors: api.backgroundGradientColors ?? [],
    description: api.description ?? null,
    abilities: api.abilities ?? [],
    voiceLineUrl: api.voiceLine?.mediaList?.[0]?.wave ?? null,
  };
}

interface AgentGridProps {
  mapAgents: Agent[];
  allApiAgents: Agent[];
  unaddedAgents: ValorantAgent[];
  mapSlug: string;
  mapId: string;
}

export default function AgentGrid({
  mapAgents,
  allApiAgents,
  unaddedAgents,
  mapSlug,
  mapId,
}: AgentGridProps) {
  const { ready } = useAppSession();
  const roster = useQuery(api.mapRoster.listByMap, ready ? { mapSlug } : "skip");
  const personalAgents = mapAgents.flatMap(agent => {
    const preference = roster?.find(row => row.agentSlug === (agent.slug?.current ?? agent._id));
    return preference?.notes === "hidden" ? [] : [{ ...agent, viability: preference?.viability ?? agent.viability }];
  });
  const [optimistic, applyOptimistic] = useOptimistic(personalAgents, reducer);
  const [isAddOpen, setAddOpen] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<Agent | null>(null);

  const sorted = sortAgentsByViability(optimistic);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4"
      >
        {sorted.map((agent, i) => (
          <m.div
            key={agent.name}
            initial={i < 4 ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i < 4 ? 0 : i * 0.02, duration: i < 4 ? 0 : 0.25 }}
          >
            <AgentCard
              agent={agent}
              mapSlug={mapSlug}
              onLongPress={setActionsTarget}
              priority={i < 4}
            />
          </m.div>
        ))}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: sorted.length * 0.02, duration: 0.25 }}
        >
          <AddAgentCard onClick={() => setAddOpen(true)} />
        </m.div>
      </m.section>

      <AddAgentModal
        open={isAddOpen}
        allAgents={allApiAgents}
        addedAgents={optimistic}
        mapSlug={mapSlug}
        unaddedAgents={unaddedAgents}
        onClose={() => setAddOpen(false)}
        applyOptimistic={(api) =>
          applyOptimistic({ type: "add", agent: makeOptimisticAgent(api) })
        }
      />
      <AgentActionsModal
        agent={actionsTarget}
        mapId={mapId}
        onClose={() => setActionsTarget(null)}
        applyOptimisticViability={(agentId, viability) =>
          applyOptimistic({ type: "viability", agentId, viability })
        }
        applyOptimisticDelete={(agentId) =>
          applyOptimistic({ type: "remove", agentId })
        }
      />
    </LazyMotion>
  );
}
