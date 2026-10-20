"use client";

import { audio as sfx } from "@/lib/audio";

import {
  LINEUP_SIDES,
  SIDE_LABELS,
  type SideFilter,
} from "@/lib/lineups/metadata";

const LABEL: Record<SideFilter, string> = {
  all: "All",
  ...SIDE_LABELS,
};

interface SideTabsProps {
  value: SideFilter;
  onChange: (next: SideFilter) => void;
}

export default function SideTabs({ value, onChange }: SideTabsProps) {
  return (
    <div
      data-onboarding="side-tabs"
      role="tablist"
      aria-label="Side filter"
      className="flex flex-wrap items-center gap-2"
    >
      {(["all", ...LINEUP_SIDES] as const).map((side) => (
        <button
          key={side}
          type="button"
          role="tab"
          aria-selected={value === side}
          onClick={() => {
            sfx.playClick();
            onChange(side);
          }}
          onMouseEnter={() => sfx.playHover()}
          className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors border ${
            value === side
              ? "border-val-red/30 bg-val-red/10 text-val-red"
              : "border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          }`}
        >
          {LABEL[side]}
        </button>
      ))}
    </div>
  );
}
