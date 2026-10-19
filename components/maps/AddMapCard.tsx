"use client";

import { Plus } from "lucide-react";
import { audio } from "@/lib/audio";

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
      className="val-card group flex w-full bg-val-surface border border-white/5 border-dashed cursor-pointer text-center relative aspect-[187/123]"
    >
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40 group-hover:text-val-red transition-colors">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/5 group-hover:bg-val-red/10 transition-colors">
          <Plus size={24} />
        </span>
        <span className="font-oswald text-sm font-bold uppercase tracking-wider">
          Add Map
        </span>
      </span>
      <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-[width] duration-200 group-hover:w-full" />
    </button>
  );
}
