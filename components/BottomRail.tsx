"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, MapIcon, Users } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import MapCard from "./MapCard";
import AgentCard from "./AgentCard";

interface BottomRailProps {
  maps: any[];
  agents: any[];
  railMode: "maps" | "agents";
  selectedMapSlug: string | null;
  selectedAgentSlug: string | null;
}

export default function BottomRail({
  maps,
  agents,
  railMode,
  selectedMapSlug,
  selectedAgentSlug,
}: BottomRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };

  const items =
    railMode === "maps"
      ? maps.map((map) => (
          <MapCard
            key={map._id}
            map={map}
            isSelected={selectedMapSlug === map.slug?.current}
            onClick={() => setParam("map", map.slug?.current ?? map._id)}
          />
        ))
      : agents.map((agent) => (
          <AgentCard
            key={agent._id}
            agent={agent}
            isSelected={selectedAgentSlug === agent.slug?.current}
            onClick={() => setParam("agent", agent.slug?.current ?? agent._id)}
          />
        ));

  return (
    <div className="shrink-0 rounded-t-lg border-t border-white/6 bg-[#1A1F2E]/85 backdrop-blur-xl backdrop-saturate-150 px-3 py-2 md:px-5 h-40">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-full bg-white/5 p-0.5">
          <button
            onClick={() => setParam("rail", "maps")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-[background-color,color,box-shadow] ${
              railMode === "maps"
                ? "bg-[#FF4655] text-white shadow-sm shadow-[#FF4655]/20"
                : "text-white/60 hover:text-white"
            }`}
          >
            <MapIcon size={12} />
            <span className="hidden sm:inline">Maps</span>
          </button>
          <button
            onClick={() => setParam("rail", "agents")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-[background-color,color,box-shadow] ${
              railMode === "agents"
                ? "bg-[#FF4655] text-white shadow-sm shadow-[#FF4655]/20"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Users size={12} />
            <span className="hidden sm:inline">Agents</span>
          </button>
        </div>
        <p className="text-xs text-white/30 font-medium uppercase tracking-wider">
          {railMode === "maps" ? "Select Map" : "Select Agent"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => scroll("left")}
          className="hidden shrink-0 items-center justify-center rounded-full bg-white/5 p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white sm:flex"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-2 overflow-x-auto p-1.5 scrollbar-hide"
        >
          {items}
        </div>

        <button
          onClick={() => scroll("right")}
          className="hidden shrink-0 items-center justify-center rounded-full bg-white/5 p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white sm:flex"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
