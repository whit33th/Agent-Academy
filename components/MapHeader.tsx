"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { GameMap } from "@/lib/types";

interface MapHeaderProps {
  selectedMap: GameMap | null;
  backHref?: string;
}

export default function MapHeader({ selectedMap, backHref = "/" }: MapHeaderProps) {
  if (!selectedMap) return null;

  return (
    <div className="flex flex-col gap-4 mb-6">
      <Link
        href={backHref}
        className="group inline-flex items-center gap-2 transition-all"
      >
        <div className="flex size-9 items-center justify-center clip-angular-sm bg-white/6 text-white/60 transition-all group-hover:bg-val-red/20 group-hover:text-val-red">
          <ArrowLeft size={16} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 group-hover:text-white/50 transition-colors">
          Back
        </span>
      </Link>

      {selectedMap.imageUrl && (
        <div className="flex items-center gap-4">
          <div className="relative size-14 overflow-visible">
            <div className="absolute inset-x-0 bottom-0 top-2 overflow-hidden clip-angular-sm bg-val-surface ring-1 ring-white/10" />
            <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden pointer-events-none z-10">
              <Image
                src={selectedMap.imageUrl}
                alt={selectedMap.name}
                width={100}
                height={100}
                className="object-cover object-center w-full h-full scale-110 -translate-y-[8%]"
              />
            </div>
          </div>
          <div className="flex h-full flex-col gap-1 justify-center">
            <h2 className="font-oswald flex items-center gap-1 text-[2.2rem] font-semibold uppercase tracking-wider text-white md:text-[2.35rem] leading-[0.9]">
              <span className="text-val-red inline-flex leading-none">//</span>
              <span>{selectedMap.name}</span>
            </h2>
           
          </div>
        </div>
      )}
    </div>
  );
}
