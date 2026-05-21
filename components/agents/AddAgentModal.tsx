"use client";

import { startTransition, useState } from "react";
import Image from "next/image";
import { Search, X, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { addAgent } from "@/app/_actions/agents";
import type { Agent } from "@/lib/types";
import type { ValorantAgent } from "@/lib/valorant-api";

interface AddAgentModalProps {
  open: boolean;
  /** All API agents (used as the picker source). */
  allAgents: Agent[];
  /** Already-added agents to show as disabled. */
  addedAgents: Agent[];
  mapSlug: string | null;
  /** API agents not yet linked (used to find the API record by displayName). */
  unaddedAgents: ValorantAgent[];
  onClose: () => void;
  applyOptimistic: (apiAgent: ValorantAgent) => void;
}

export default function AddAgentModal({
  open,
  allAgents,
  addedAgents,
  mapSlug,
  unaddedAgents,
  onClose,
  applyOptimistic,
}: AddAgentModalProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = allAgents
    .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const isAlreadyAdded = (agentName: string) =>
    addedAgents.some((a) => a.name.toLowerCase() === agentName.toLowerCase());

  const handleAdd = (agentName: string) => {
    setError(null);
    onClose();
    const apiAgent = unaddedAgents.find((a) => a.displayName === agentName);
    startTransition(async () => {
      if (apiAgent) applyOptimistic(apiAgent);
      const result = await addAgent(agentName, mapSlug);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setQuery("");
        setError(null);
      }}
      labelledBy="add-agent-title"
      className="w-full max-w-md overflow-hidden bg-val-surface border border-white/10 clip-angular cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="add-agent-title"
          className="font-oswald text-xl font-bold uppercase text-white"
        >
          Register Agent
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close add-agent dialog"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </header>

      <section className="p-4 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search agent..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2 rounded-sm"
          >
            {error}
          </p>
        )}

        <div
          className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar"
          data-lenis-prevent
        >
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-sm text-white/40">
              No agents found.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {filtered.map((agent) => {
                const added = isAlreadyAdded(agent.name);
                return (
                  <button
                    key={agent._id}
                    type="button"
                    disabled={added}
                    onClick={() => handleAdd(agent.name)}
                    title={added ? `${agent.name} (Already added)` : agent.name}
                    aria-label={
                      added
                        ? `${agent.name} (already added)`
                        : `Add ${agent.name}`
                    }
                    className={`group relative aspect-square w-full rounded-sm overflow-hidden bg-white/3 border transition-[background-color,border-color,scale,opacity] select-none ${
                      added
                        ? "border-white/5 opacity-55 cursor-default"
                        : "hover:bg-val-red/10 border-white/5 hover:border-val-red/30 cursor-pointer active:scale-95"
                    }`}
                  >
                    {agent.displayIcon && (
                      <Image
                        src={agent.displayIcon}
                        alt={agent.name}
                        fill
                        sizes="160px"
                        className={`object-cover transition-transform duration-200 ${
                          added
                            ? "grayscale brightness-75"
                            : "group-hover:scale-110"
                        }`}
                      />
                    )}
                    <span className="absolute inset-x-0 bottom-0 text-[9px] text-center font-bold text-white py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none truncate px-0.5">
                      {agent.name}
                    </span>
                    {added && (
                      <span className="absolute inset-0 bg-black/45 flex items-center justify-center pointer-events-none">
                        <span className="flex size-7 items-center justify-center rounded bg-val-red/25 border border-val-red/35 text-white">
                          <Check size={14} className="stroke-[3]" />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Modal>
  );
}
