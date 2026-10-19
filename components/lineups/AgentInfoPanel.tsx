"use client";

import Image from "next/image";
import { LayoutGrid } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import type { Agent, AgentAbility } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import VoiceLineButton from "./VoiceLineButton";

interface AgentInfoPanelProps {
  agent: Agent;
  selectedAbilityIdx: number;
  onSelectAbility: (idx: number) => void;
  accentColor: string;
  filteredCount?: number;
  totalCount?: number;
}

export default function AgentInfoPanel({
  agent,
  selectedAbilityIdx,
  onSelectAbility,
  accentColor,
  filteredCount,
  totalCount,
}: AgentInfoPanelProps) {
  const abilities = agent.abilities ?? [];
  const selectedAbility: AgentAbility | null =
    selectedAbilityIdx !== -1 ? abilities[selectedAbilityIdx] ?? null : null;

  return (
    <m.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full shrink-0 lg:w-80"
    >
      <div className="lg:pb-3 h-[42px] flex items-center gap-2">
        {agent.roleIcon && (
          <Image
            src={agent.roleIcon}
            alt={agent.roleName}
            width={14}
            height={14}
            className="opacity-70"
          />
        )}
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
          {agent.roleName}
        </p>
      </div>

      <h1
        className="font-oswald text-5xl brightness-170 font-bold uppercase leading-none mb-3"
        style={{
          color: accentColor,
          textShadow: `0 0 40px ${accentColor}30`,
        }}
      >
        {agent.name}
      </h1>

      {filteredCount !== undefined && totalCount !== undefined && (
        <p className="mb-3 text-xs text-white/40 tabular-nums">
          <span style={{ color: accentColor }}>{filteredCount}</span>
          <span className="text-white/25"> / {totalCount} setups visible</span>
        </p>
      )}

      <VoiceLineButton
        voiceUrl={agent.voiceLineUrl}
        agentId={agent._id}
        accentColor={accentColor}
      />

      {agent.description && (
        <p className="mb-5 text-sm leading-relaxed text-white/60 font-light">
          {agent.description}
        </p>
      )}

      {agent.displayIcon && (
        <figure className="relative my-4 aspect-square w-42 overflow-hidden">
          <Image
            src={agent.displayIcon}
            alt={agent.name}
            fill
            sizes="336px"
            className="object-cover object-center"
            style={{ filter: `drop-shadow(0 20px 40px ${accentColor}40)` }}
            priority
          />
        </figure>
      )}

      <section className="mt-2">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          Abilities Filter:
        </p>
        <div
          data-onboarding="ability-filter"
          className="mb-4 flex items-center gap-2 flex-wrap"
        >
          <button
            type="button"
            onClick={() => {
              sfx.playClick();
              onSelectAbility(-1);
            }}
            onMouseEnter={() => sfx.playHover()}
            title="Show all abilities"
            aria-label="Show all abilities"
            aria-pressed={selectedAbilityIdx === -1}
            className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-[border-color,background-color,color,opacity,transform] duration-200 ${
              selectedAbilityIdx === -1
                ? "scale-105"
                : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:opacity-100"
            }`}
            style={
              selectedAbilityIdx === -1
                ? {
                    borderColor: `${accentColor}50`,
                    backgroundColor: `${accentColor}15`,
                    color: accentColor,
                  }
                : undefined
            }
          >
            <LayoutGrid size={16} />
            {selectedAbilityIdx === -1 && (
              <m.span
                layoutId="ability-indicator"
                className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: accentColor }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          {abilities.map((ability, idx) =>
            ability.displayIcon ? (
              <button
                key={ability.slot || idx}
                type="button"
                onClick={() => {
                  sfx.playClick();
                  onSelectAbility(idx);
                }}
                onMouseEnter={() => sfx.playHover()}
                title={ability.displayName}
                aria-label={`Filter by ${ability.displayName}`}
                aria-pressed={idx === selectedAbilityIdx}
                className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-[border-color,background-color,opacity,transform] duration-200 ${
                  idx === selectedAbilityIdx
                    ? "scale-105"
                    : "border-white/10 bg-white/5 opacity-60 hover:opacity-100"
                }`}
                style={
                  idx === selectedAbilityIdx
                    ? {
                        borderColor: `${accentColor}50`,
                        backgroundColor: `${accentColor}15`,
                        boxShadow: `0 0 16px ${accentColor}25`,
                      }
                    : undefined
                }
              >
                <Image
                  src={ability.displayIcon}
                  alt={ability.displayName}
                  width={22}
                  height={22}
                  className="object-contain"
                />
                {idx === selectedAbilityIdx && (
                  <m.span
                    layoutId="ability-indicator"
                    className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: accentColor }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ) : null,
          )}
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={selectedAbility?.displayName ?? "all"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p
              className="mb-1 text-xs font-bold uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              {selectedAbility ? selectedAbility.displayName : "All Setups"}
            </p>
            <p className="text-xs leading-relaxed text-white/40">
              {selectedAbility
                ? selectedAbility.description
                : "Showing setups for all abilities. Select an icon above to filter."}
            </p>
          </m.div>
        </AnimatePresence>
      </section>
    </m.aside>
  );
}
