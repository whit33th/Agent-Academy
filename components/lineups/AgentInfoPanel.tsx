"use client";

import Image from "@/components/ui/CatalogImage";
import { LayoutGrid } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { type LineupAbility } from "@/lib/lineups/metadata";
import type { Agent, AgentAbility } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import VoiceLineButton from "./VoiceLineButton";

interface AgentInfoPanelProps {
  agent: Agent;
  selectedSlot: "all" | LineupAbility;
  onSelectAbility: (slot: "all" | LineupAbility) => void;
  accentColor: string;
  filteredCount?: number;
  totalCount?: number;
}

export default function AgentInfoPanel({
  agent,
  selectedSlot,
  onSelectAbility,
  accentColor,
  filteredCount,
  totalCount,
}: AgentInfoPanelProps) {
  const abilities = agent.abilities ?? [];
  const selectedAbility: AgentAbility | null =
    abilities.find((ability) => ability.slot === selectedSlot) ?? null;

  return (
    <m.aside
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="order-first grid w-full shrink-0 grid-cols-2 gap-4 lg:order-last lg:block lg:w-80"
    >
      <div>
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

        <p className="mb-3 min-h-4 text-xs text-white/40 tabular-nums">
          {filteredCount !== undefined && totalCount !== undefined && (
            <>
              <span style={{ color: accentColor }}>{filteredCount}</span>
              <span className="text-white/25">
                {" "}
                / {totalCount} setups visible
              </span>
            </>
          )}
        </p>

        <VoiceLineButton
          voiceUrl={agent.voiceLineUrl}
          agentId={agent._id}
          accentColor={accentColor}
        />

        {agent.description && (
          <p className="mb-5 hidden text-sm leading-relaxed text-white/60 font-light lg:block">
            {agent.description}
          </p>
        )}

        {agent.displayIcon && (
          <figure className="relative my-4 hidden aspect-square w-42 overflow-hidden lg:block">
            <Image
              src={agent.displayIcon}
              alt={agent.name}
              fill
              sizes="336px"
              quality={95}
              priority
              className="object-cover object-center"
              style={{ filter: `drop-shadow(0 20px 40px ${accentColor}40)` }}
            />
          </figure>
        )}
      </div>

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
              onSelectAbility("all");
            }}
            onMouseEnter={() => sfx.playHover()}
            title="Show all abilities"
            aria-label="Show all abilities"
            aria-pressed={selectedSlot === "all"}
            className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-[border-color,background-color,color,opacity,transform] duration-200 ${
              selectedSlot === "all"
                ? "scale-105"
                : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:opacity-100"
            }`}
            style={
              selectedSlot === "all"
                ? {
                    borderColor: `${accentColor}50`,
                    backgroundColor: `${accentColor}15`,
                    color: accentColor,
                  }
                : undefined
            }
          >
            <LayoutGrid size={16} />
            {selectedSlot === "all" && (
              <m.span
                layoutId="ability-indicator"
                className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: accentColor }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>

          {abilities.map((ability) =>
            ability.displayIcon ? (
              <button
                key={ability.slot || ability.displayName}
                type="button"
                onClick={() => {
                  sfx.playClick();
                  onSelectAbility(ability.slot);
                }}
                onMouseEnter={() => sfx.playHover()}
                title={ability.displayName}
                aria-label={`Filter by ${ability.displayName}`}
                aria-pressed={ability.slot === selectedSlot}
                className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-[border-color,background-color,opacity,transform] duration-200 ${
                  ability.slot === selectedSlot
                    ? "scale-105"
                    : "border-white/10 bg-white/5 opacity-60 hover:opacity-100"
                }`}
                style={
                  ability.slot === selectedSlot
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
                {ability.slot === selectedSlot && (
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

        <button
          type="button"
          aria-label="Filter by unspecified ability"
          aria-pressed={selectedSlot === "unspecified"}
          onClick={() => onSelectAbility("unspecified")}
          className="mb-3 text-xs text-white/50 underline"
        >
          Unspecified ability
        </button>
        <AnimatePresence mode="wait">
          <m.div
            key={selectedSlot}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p
              className="mb-1 text-xs font-bold uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              {selectedSlot === "unspecified"
                ? "Unspecified ability"
                : selectedAbility
                  ? selectedAbility.displayName
                  : "All Setups"}
            </p>
            <p className="text-xs leading-relaxed text-white/40">
              {selectedSlot === "unspecified"
                ? "Setups without an explicitly selected ability."
                : selectedAbility
                  ? selectedAbility.description
                  : "Showing setups for all abilities. Select an icon above to filter."}
            </p>
          </m.div>
        </AnimatePresence>
      </section>
    </m.aside>
  );
}
