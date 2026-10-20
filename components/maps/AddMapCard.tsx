"use client";

import { Plus } from "lucide-react";
import { audio } from "@/lib/audio";
import { MapCardFrame } from "./MapCardVisual";

interface AddMapCardProps {
  onClick: () => void;
}

export default function AddMapCard({ onClick }: AddMapCardProps) {
  return (
    <button
      type="button"
      onClick={() => {
        audio.playClick();
        onClick();
      }}
      onMouseEnter={() => audio.playHover()}
      className="map-select-card group relative block w-full cursor-pointer bg-val-surface text-left focus-visible:outline focus-visible:outline-val-red"
    >
      <span className="absolute inset-[var(--stroke)] bg-gradient-to-br from-white/5 to-transparent" />
      <span className="absolute inset-0 flex items-center justify-center text-white/40 group-hover:text-val-red transition-colors">
        <span className="flex size-12 items-center justify-center bg-white/5 group-hover:bg-val-red/10 transition-colors">
          <Plus size={24} />
        </span>
      </span>
      <span className="map-select-name">
        <span>Add Map</span>
      </span>
      <MapCardFrame />
    </button>
  );
}
