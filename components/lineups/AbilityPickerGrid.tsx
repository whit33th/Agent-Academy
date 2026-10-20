"use client";

import Image from "@/components/ui/CatalogImage";
import type { AgentAbility } from "@/lib/types";
import { getSlotKey } from "@/lib/utils/ability";
import type { LineupAbility } from "@/lib/lineups/metadata";

interface AbilityPickerGridProps {
  abilities: AgentAbility[];
  selectedSlot: LineupAbility;
  onSelect: (slot: LineupAbility) => void;
}

export default function AbilityPickerGrid({
  abilities,
  selectedSlot,
  onSelect,
}: AbilityPickerGridProps) {
  if (abilities.length === 0) {
    return (
      <p className="text-sm text-white/40 italic">
        No abilities found for this agent.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {abilities.map((ability) => {
        const isSelected = selectedSlot === ability.slot;
        const keyBind = getSlotKey(ability.slot);
        return (
          <button
            key={ability.slot}
            type="button"
            onClick={() => onSelect(ability.slot)}
            aria-pressed={isSelected}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-sm border transition-[border-color,background-color,color,box-shadow] cursor-pointer select-none text-center h-24 ${
              isSelected
                ? "border-val-red bg-val-red/10 text-white shadow-[0_0_15px_rgba(255,70,85,0.2)]"
                : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20"
            }`}
          >
            <span className="absolute top-1.5 right-1.5 px-1 py-0.5 text-[9px] font-bold font-oswald bg-black/60 rounded-sm text-white/80 group-hover:text-white">
              {keyBind}
            </span>
            {ability.displayIcon ? (
              <span className="relative size-8 mb-1.5 transition-transform duration-200 group-hover:scale-110 block">
                <Image
                  src={ability.displayIcon}
                  alt={ability.displayName}
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </span>
            ) : (
              <span className="size-8 mb-1.5 flex items-center justify-center bg-white/5 rounded-sm">
                <span className="text-[10px] font-bold text-white/35">
                  {keyBind}
                </span>
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider truncate w-full px-1">
              {ability.displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
