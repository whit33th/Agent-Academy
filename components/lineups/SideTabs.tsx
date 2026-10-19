"use client";

import { audio as sfx } from "@/lib/audio";

export type SideKey = "all" | "atk" | "def";

const LABEL: Record<SideKey, string> = {
  all: "All",
  atk: "Attack",
  def: "Defense",
};

interface SideTabsProps {
  value: SideKey;
  onChange: (next: SideKey) => void;
}

export default function SideTabs({ value, onChange }: SideTabsProps) {
  return (
    <div
      data-onboarding="side-tabs"
      role="tablist"
      aria-label="Side filter"
      className="flex items-center gap-2"
    >
      {(Object.keys(LABEL) as SideKey[]).map((side) => (
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
