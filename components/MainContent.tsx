"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import ScreenshotGrid from "./ScreenshotGrid";
import Image from "next/image";
import { urlFor } from "@/lib/sanity";

interface MainContentProps {
  maps: any[];
  agents: any[];
  selectedMapSlug: string | null;
  selectedAgentSlug: string | null;
  selectedMapId: string | null;
  selectedAgentId: string | null;
  mapAgents: any[];
  agentMaps: any[];
  screenshots: any[];
}

const roleTextColors: Record<string, string> = {
  duelist: "text-[#FF4655]",
  controller: "text-[#0FAF4B]",
  sentinel: "text-[#2E8DE5]",
  initiator: "text-[#F5A623]",
};

const viabilityBgColors: Record<string, string> = {
  S: "bg-[#FF4655]",
  A: "bg-[#F5A623]",
  B: "bg-[#2E8DE5]",
  C: "bg-[#8B97A8]",
};

export default function MainContent({
  maps,
  agents,
  selectedMapId,
  selectedAgentId,
  mapAgents,
  agentMaps,
  screenshots,
}: MainContentProps) {
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

  const selectedMap = maps.find((m) => m._id === selectedMapId);
  const selectedAgent = agents.find((a) => a._id === selectedAgentId);

  const clearMap = () => setParam("map", null);
  const clearAgent = () => setParam("agent", null);
  const clearSelection = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("map");
    params.delete("agent");
    router.push(`${pathname}?${params.toString()}`);
  };

  const showBack = selectedMapId !== null || selectedAgentId !== null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
      {showBack && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4"
        >
          <button
            onClick={clearSelection}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft size={18} />
          </button>
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        {!selectedMapId && !selectedAgentId && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto max-w-4xl py-6 text-center md:py-10"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#FF4655] ring-1 ring-[#FF4655]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF4655]" />
              Valorant Lineups
            </div>
            <h2 className="font-oswald text-4xl font-bold uppercase tracking-wider text-white md:text-6xl">
              <span className="text-[#FF4655]">Lineups</span>{" "}
              <span className="text-white">Reference</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-white/40">
              Select a map or agent below to discover lineups.
            </p>
          </motion.div>
        )}

        {selectedMapId && !selectedAgentId && (
          <motion.div
            key="agents"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {selectedMap && (
              <div className="mb-6 flex items-center gap-4">
                {selectedMap.image && (
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-white/10">
                    <Image
                      src={urlFor(selectedMap.image)
                        .width(112)
                        .height(112)
                        .url()}
                      alt={selectedMap.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <h2 className="font-oswald text-2xl font-bold uppercase tracking-wider text-white">
                    {selectedMap.name}
                  </h2>
                  <p className="text-sm text-white/50">Pick an agent</p>
                </div>
              </div>
            )}

            {mapAgents && mapAgents.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {mapAgents.map((ma: any, i: number) => (
                  <AgentPreviewCard
                    key={ma.agent._id}
                    agent={ma.agent}
                    viability={ma.viability}
                    index={i}
                    onClick={() => setParam("agent", ma.agent._id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {agents.map((agent: any, i: number) => (
                  <AgentPreviewCard
                    key={agent._id}
                    agent={agent}
                    index={i}
                    onClick={() => setParam("agent", agent._id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {selectedAgentId && !selectedMapId && (
          <motion.div
            key="maps"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {selectedAgent && (
              <div className="mb-6 flex items-center gap-4">
                {selectedAgent.image && (
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-white/10">
                    <Image
                      src={urlFor(selectedAgent.image)
                        .width(112)
                        .height(112)
                        .url()}
                      alt={selectedAgent.name}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                )}
                <div>
                  <h2 className="font-oswald text-2xl font-bold uppercase tracking-wider text-white">
                    {selectedAgent.name}
                  </h2>
                  <p className="text-sm text-white/50">Pick a map</p>
                </div>
              </div>
            )}

            {agentMaps && agentMaps.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {agentMaps.map((am: any, i: number) => (
                  <MapPreviewCard
                    key={am.map._id}
                    map={am.map}
                    viability={am.viability}
                    index={i}
                    onClick={() => setParam("map", am.map._id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {maps.map((map: any, i: number) => (
                  <MapPreviewCard
                    key={map._id}
                    map={map}
                    index={i}
                    onClick={() => setParam("map", map._id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {selectedMapId && selectedAgentId && (
          <motion.div
            key="screenshots"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="mb-6 flex items-center gap-4">
              {selectedAgent?.image && (
                <div className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-[#FF4655]/30">
                  <Image
                    src={urlFor(selectedAgent.image)
                      .width(112)
                      .height(112)
                      .url()}
                    alt={selectedAgent.name}
                    fill
                    className="object-cover object-top"
                  />
                </div>
              )}
              <div>
                <h2 className="font-oswald text-2xl font-bold uppercase tracking-wider text-white">
                  {selectedAgent?.name}{" "}
                  <span className="text-[#FF4655]">—</span> {selectedMap?.name}
                </h2>
                <p className="text-sm text-white/40">
                  {screenshots?.length || 0} lineup
                  {screenshots?.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {screenshots && screenshots.length > 0 ? (
              <ScreenshotGrid screenshots={screenshots} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg text-white/40">
                  No screenshots yet for this combo.
                </p>
                <p className="mt-2 text-sm text-white/25">
                  Add some in Sanity Studio.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentPreviewCard({
  agent,
  viability,
  index,
  onClick,
}: {
  agent: any;
  viability?: string;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg bg-white/5 p-2 text-left ring-1 ring-white/10 transition-[background-color,box-shadow] hover:bg-white/10 hover:ring-white/30"
    >
      {agent.image && (
        <div className="relative mx-auto aspect-3/4 w-full overflow-hidden rounded-md bg-white/5">
          <Image
            src={urlFor(agent.image).width(400).height(530).url()}
            alt={agent.name}
            fill
            className="object-cover object-top transition-[filter] duration-300 group-hover:brightness-110"
            sizes="(max-width: 640px) 50vw, 20vw"
          />
        </div>
      )}
      <div className="mt-2">
        <p className="font-oswald text-base font-bold uppercase text-white">
          {agent.name}
        </p>
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            roleTextColors[agent.role] || "text-[#8B97A8]"
          }`}
        >
          {agent.role}
        </p>
      </div>
      {viability && (
        <div
          className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ${
            viabilityBgColors[viability] || "bg-[#8B97A8]"
          }`}
        >
          {viability}
        </div>
      )}
    </motion.button>
  );
}

function MapPreviewCard({
  map,
  viability,
  index,
  onClick,
}: {
  map: any;
  viability?: string;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg bg-white/5 p-2 text-left ring-1 ring-white/10 transition-[background-color,box-shadow] hover:bg-white/10 hover:ring-white/30"
    >
      {map.image && (
        <div className="relative mx-auto aspect-3/4 w-full overflow-hidden rounded-md bg-white/5">
          <Image
            src={urlFor(map.image).width(400).height(530).url()}
            alt={map.name}
            fill
            className="object-cover transition-[filter] duration-300 group-hover:brightness-110"
            sizes="(max-width: 640px) 50vw, 20vw"
          />
        </div>
      )}
      <div className="mt-2">
        <p className="font-oswald text-base font-bold uppercase text-white">
          {map.name}
        </p>
      </div>
      {viability && (
        <div
          className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ${
            viabilityBgColors[viability] || "bg-[#8B97A8]"
          }`}
        >
          {viability}
        </div>
      )}
    </motion.button>
  );
}
