"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { m } from "framer-motion";
import type { Agent } from "@/lib/types";
import VoiceLineButton from "./VoiceLineButton";

type EmptyVariant = "no-setups" | "no-filter-match";

interface LineupEmptyStateProps {
  agent: Agent;
  accentColor: string;
  variant: EmptyVariant;
  favoritesOnly?: boolean;
  onAddSetup: () => void;
}

export default function LineupEmptyState({
  agent,
  accentColor,
  variant,
  favoritesOnly,
  onAddSetup,
}: LineupEmptyStateProps) {
  const isEmpty = variant === "no-setups";

  return (
    <m.div
      data-onboarding="lineup-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {agent.displayIcon && (
        <div
          className="relative mb-6 size-24 opacity-40"
          style={{ filter: `drop-shadow(0 0 24px ${accentColor}50)` }}
        >
          <Image
            src={agent.displayIcon}
            alt=""
            fill
            className="object-contain"
            sizes="96px"
          />
        </div>
      )}

      <h2
        className="font-oswald text-2xl font-bold uppercase tracking-wide text-white mb-2"
        style={{ color: isEmpty ? accentColor : undefined }}
      >
        {isEmpty
          ? "No setups yet"
          : favoritesOnly
            ? "No favorites here"
            : "Nothing matches"}
      </h2>

      <p className="max-w-sm text-sm text-white/45 leading-relaxed mb-5">
        {isEmpty ? (
          <>
            {agent.name} on this map is waiting for the first smoke, flash, or
            molly. Drop a screenshot and name it — your squad will thank you.
          </>
        ) : favoritesOnly ? (
          <>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-bold">F</kbd> on a setup to star it, or turn off the favorites filter.</>
        ) : (
          <>Try another side tab, ability filter, or clear filters to see more setups.</>
        )}
      </p>

      <div className="flex flex-col items-center gap-3">
        <VoiceLineButton
          voiceUrl={agent.voiceLineUrl}
          agentId={agent._id}
          accentColor={accentColor}
        />

        {isEmpty && (
          <button
            type="button"
            onClick={onAddSetup}
            className="flex items-center gap-2 px-4 py-2 clip-angular-sm bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-colors cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.12)]"
          >
            <Plus size={14} className="stroke-[3]" />
            Add your first setup
          </button>
        )}
      </div>
    </m.div>
  );
}
