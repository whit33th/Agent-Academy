"use client";

import Image from "@/components/ui/CatalogImage";
import { Plus } from "lucide-react";
import { audio } from "@/lib/audio";

interface AddAgentCardProps {
  onClick: () => void;
}

export default function AddAgentCard({ onClick }: AddAgentCardProps) {
  return (
    <button
      type="button"
      onClick={() => {
        audio.playClick();
        onClick();
      }}
      onMouseEnter={() => audio.playHover()}
      className="group relative block w-full h-85 overflow-visible transition-[transform,translate] duration-150 hover:-translate-y-1.5 cursor-pointer text-left border-0 outline-none p-0 bg-transparent"
      aria-label="Add agent"
    >
      <div className="absolute inset-x-0 bottom-0 top-5 overflow-hidden clip-angular border border-white/5 bg-gradient-to-b from-zinc-800/40 to-zinc-950/80 transition-[border-color,box-shadow] duration-200 group-hover:border-val-red/80 group-hover:shadow-[0_12px_30px_rgba(255,70,85,0.15)]">
        <div className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity duration-200">
          <Image
            src="/agent-restore-card.png"
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
            className="object-cover object-top"
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:border-val-red/40 group-hover:bg-val-red/10 text-white/40 group-hover:text-val-red transition-colors">
            <Plus size={32} />
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 z-30 p-3 text-center">
        <p className="font-oswald text-lg font-bold uppercase tracking-wider text-white group-hover:text-val-red transition-colors">
          Add Agent
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">
          Try someone new!
        </p>
      </div>

      <div className="absolute left-0 top-5 bottom-0 w-px z-40 bg-zinc-600 group-hover:bg-val-red transition-colors" />
      <div className="absolute left-0 bottom-0 right-0 w-full h-px z-40 bg-zinc-600 group-hover:bg-val-red transition-colors" />
    </button>
  );
}
