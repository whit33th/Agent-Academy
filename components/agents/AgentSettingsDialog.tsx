"use client";
import { useCollectionActions } from "@/lib/collection/useCollectionActions";

import { useTransition, useState } from "react";
import Image from "@/components/ui/CatalogImage";
import { Trash2, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmAction from "@/components/ui/ConfirmAction";
import type { Agent } from "@/lib/types";
import { TIER_LIST, type ViabilityTier } from "@/lib/utils/viability";

interface AgentSettingsDialogProps {
  agent: Agent | null;
  mapId: string;
  onClose: () => void;
}

export default function AgentSettingsDialog({
  agent,
  mapId,
  onClose,
}: AgentSettingsDialogProps) {
  const { deleteAgent, updateAgentViability } = useCollectionActions();
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  if (!agent) return null;

  const handleSetTier = (tier: ViabilityTier | null) => {
    startTransition(async () => {
      const result = await updateAgentViability(
        agent.slug?.current ?? agent._id,
        mapId,
        tier,
      );
      if (!result.ok) setError(result.error);
      else onClose();
    });
  };

  const handleDelete = () => {
    if (isPending) return;
    startTransition(async () => {
      const result = await deleteAgent(agent.slug?.current ?? agent._id, mapId);
      if (!result.ok) setError(result.error);
      else onClose();
    });
  };

  const isCurrentTier = (tier: ViabilityTier) =>
    (agent.viability ?? "").toUpperCase() === tier;

  return (
    <Modal
      open={!!agent}
      onClose={() => {
        if (!isPending) {
          setConfirming(false);
          setError(null);
          onClose();
        }
      }}
      labelledBy="agent-actions-title"
      className="w-full max-w-sm bg-val-surface border border-white/10 clip-angular overflow-hidden cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="agent-actions-title"
          className="font-oswald text-lg font-bold uppercase text-white truncate"
        >
          Agent Actions: {agent.name}
        </h3>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          aria-label="Close agent actions"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </header>

      <div className="p-4 flex flex-col gap-4">
        {confirming ? (
          <ConfirmAction
            title={`Hide ${agent.name}?`}
            description="This agent will leave the map's collection. Your saved setups will be kept so you can add the agent again later."
            label="Hide agent"
            pending={isPending}
            error={error}
            onConfirm={handleDelete}
            onCancel={() => {
              setConfirming(false);
              setError(null);
            }}
          />
        ) : (
          <>
            {error && (
              <p role="alert" className="text-sm text-val-red">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3 bg-white/3 p-3 border border-white/5 clip-angular-sm">
              {agent.displayIcon && (
                <div className="relative size-12 rounded-sm overflow-hidden bg-black/40 flex-shrink-0">
                  <Image
                    src={agent.displayIcon}
                    alt={agent.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <span className="font-semibold text-white block">
                  {agent.name}
                </span>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  {agent.roleName}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                Tier:
              </span>
              <div className="flex items-center justify-between gap-1 bg-black/30 p-2 sm:p-3 rounded-sm border border-white/5">
                {TIER_LIST.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSetTier(tier)}
                    title={`${tier}-Tier`}
                    aria-label={`Set ${agent.name} tier to ${tier}`}
                    aria-pressed={isCurrentTier(tier)}
                    className={`relative flex size-10 sm:size-12 items-center aspect-square justify-center transition-[scale,opacity,filter] cursor-pointer select-none active:scale-95 filter ${
                      isCurrentTier(tier)
                        ? "scale-115 opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                        : "opacity-50 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <Image
                      src={`/ranks/${tier.toLowerCase()}.png`}
                      alt={`${tier} Rank`}
                      fill
                      sizes="96px"
                      className="object-contain"
                    />
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSetTier(null)}
                  title="Remove Tier (Unranked)"
                  aria-label={`Clear tier for ${agent.name}`}
                  aria-pressed={!agent.viability}
                  className={`relative flex size-10 sm:size-12 items-center aspect-square justify-center transition-[scale,opacity,filter] cursor-pointer select-none active:scale-95 filter ${
                    !agent.viability
                      ? "scale-115 opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      : "opacity-50 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  <Image
                    src="/ranks/unranked.png"
                    alt="Unranked"
                    fill
                    sizes="96px"
                    className="object-contain"
                  />
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirming(true);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-sm bg-val-red/10 border border-val-red/20 text-val-red hover:bg-val-red hover:text-white hover:border-val-red transition-colors cursor-pointer font-bold uppercase tracking-wider text-xs"
              >
                <span>Remove Agent from Map</span>
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
