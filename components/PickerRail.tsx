"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, MapIcon, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { Agent, GameMap } from "@/lib/types";

interface PickerRailProps {
  maps: GameMap[];
  agents: Agent[];
}

export default function PickerRail({ maps, agents }: PickerRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const railMode = (searchParams.get("rail") as "maps" | "agents") || "maps";
  const selectedMapSlug = searchParams.get("map");
  const selectedAgentSlug = searchParams.get("agent");

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -240 : 240,
        behavior: "smooth",
      });
    }
  };

  // Build href for mode toggle — clear the opposite selection when switching
  const buildModeHref = (mode: "maps" | "agents") => {
    const params = new URLSearchParams();
    params.set("rail", mode);
    // When switching modes, keep the existing selection from the OTHER mode
    if (mode === "maps" && selectedAgentSlug) {
      params.set("agent", selectedAgentSlug);
    }
    if (mode === "agents" && selectedMapSlug) {
      params.set("map", selectedMapSlug);
    }
    return `/?${params.toString()}`;
  };

  // Build href for item click
  const buildItemHref = (type: "map" | "agent", slug: string) => {
    const params = new URLSearchParams();
    params.set("rail", railMode);

    if (type === "map") {
      params.set("map", slug);
      if (selectedAgentSlug) params.set("agent", selectedAgentSlug);
    } else {
      params.set("agent", slug);
      if (selectedMapSlug) params.set("map", selectedMapSlug);
    }

    return `/?${params.toString()}`;
  };

  const items: (GameMap | Agent)[] = railMode === "maps" ? maps : agents;

  return (
    <div className="rail-glass shrink-0 px-3 py-2 md:px-5 flex flex-col gap-2">
      {/* Top row: mode toggle + label */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-0.5 rounded-sm bg-white/5 p-0.5">
          <Link
            href={buildModeHref("maps")}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all ${
              railMode === "maps"
                ? "bg-val-red text-white shadow-sm shadow-val-red/20"
                : "text-white/50 hover:text-white"
            }`}
          >
            <MapIcon size={12} />
            <span className="hidden sm:inline">Maps</span>
          </Link>
          <Link
            href={buildModeHref("agents")}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all ${
              railMode === "agents"
                ? "bg-val-red text-white shadow-sm shadow-val-red/20"
                : "text-white/50 hover:text-white"
            }`}
          >
            <Users size={12} />
            <span className="hidden sm:inline">Agents</span>
          </Link>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          {railMode === "maps" ? "Select Map" : "Select Agent"}
        </p>
      </div>

      {/* Scrollable rail */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => scroll("left")}
          className="hidden shrink-0 items-center justify-center rounded-sm bg-white/5 p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white sm:flex"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-2 overflow-x-auto py-1.5 scrollbar-hide"
        >
          {items.map((item) => {
            const isMap = railMode === "maps";
            const slug = item.slug?.current ?? item._id;
            const isSelected = isMap
              ? selectedMapSlug === slug
              : selectedAgentSlug === slug;

            return (
              <Link
                key={item._id}
                href={buildItemHref(isMap ? "map" : "agent", slug)}
                className={`group relative shrink-0 overflow-hidden clip-angular-sm transition-all ${
                  isSelected ? "val-selected" : ""
                }`}
              >
                <div
                  className={`relative overflow-hidden bg-val-surface ${
                    isMap ? "h-[72px] w-[120px]" : "h-[96px] w-[80px]"
                  }`}
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={isMap ? 120 : 80}
                      height={isMap ? 72 : 96}
                      className={`h-full w-full transition-all duration-100 group-hover:brightness-125 ${
                        isMap
                          ? "object-cover"
                          : "object-cover object-top"
                      } ${isSelected ? "brightness-110" : "brightness-75"}`}
                    />
                  )}
                  {/* Name overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="font-oswald text-[10px] font-bold uppercase tracking-wide text-white/90 truncate">
                      {item.name}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => scroll("right")}
          className="hidden shrink-0 items-center justify-center rounded-sm bg-white/5 p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white sm:flex"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
