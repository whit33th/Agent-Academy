import {
  getEnrichedMaps,
  getEnrichedAgents,
  getAgentsForMap,
  getScreenshots,
  getUnaddedMaps,
  getAllApiAgents,
  getUnaddedAgents,
  getUnaddedAgentsForMap,
} from "@/lib/data";
import type { GameMap, Agent } from "@/lib/types";
import MapGrid from "@/components/MapGrid";
import AgentGrid from "@/components/AgentGrid";
import LineupViewer from "@/components/LineupViewer";
import LiveSyncStatus from "@/components/LiveSyncStatus";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const mapSlug = params.map;
  const agentSlug = params.agent;

  try {
    const [maps, agents, unaddedMaps, allApiAgents, globalUnaddedAgents] = await Promise.all([
      getEnrichedMaps(),
      getEnrichedAgents(),
      getUnaddedMaps(),
      getAllApiAgents(),
      getUnaddedAgents(),
    ]);

    // Resolve selections
    const selectedMap = mapSlug
      ? (maps.find((m) => m.slug?.current === mapSlug || m._id === mapSlug) ??
        null)
      : null;
    const selectedAgent = agentSlug
      ? (agents.find(
          (a) => a.slug?.current === agentSlug || a._id === agentSlug,
        ) ?? null)
      : null;

    const selectedMapId = selectedMap?._id ?? null;
    const selectedAgentId = selectedAgent?._id ?? null;

    const unaddedAgents = selectedMapId
      ? await getUnaddedAgentsForMap(selectedMapId)
      : globalUnaddedAgents;

    let content: React.ReactNode;

    if (selectedMapId && selectedAgentId && selectedAgent && selectedMap) {
      // State 3: Both selected → show lineups with agent panel
      const screenshots = await getScreenshots(selectedMapId, selectedAgentId);
      content = (
        <LineupViewer
          screenshots={screenshots}
          agent={selectedAgent}
          map={selectedMap}
        />
      );
    } else if (selectedMapId && selectedMap) {
      // State 2: Map selected → show agent grid for this map
      const mapAgents = await getAgentsForMap(selectedMapId);
      content = (
        <AgentGrid
          agents={mapAgents}
          allAgents={allApiAgents}
          unaddedAgents={unaddedAgents}
          selectedMapSlug={mapSlug}
          selectedMapName={selectedMap.name}
          selectedMapId={selectedMapId}
        />
      );
    } else {
      // State 1: Nothing selected → show map grid
      content = (
        <MapGrid
          maps={maps}
          agentCount={agents.length}
          unaddedMaps={unaddedMaps}
        />
      );
    }

    const backHref = selectedAgentId ? `/?map=${mapSlug}` : "/";

    return (
      <div className="min-h-screen bg-val-bg p-4 md:p-6 lg:p-8">
        {/* Row 1: Symmetrical Top Navigation Bar (Always a Row) */}
        <div className="flex flex-row justify-between items-center w-full mb-4">
          {/* Left Side: Navigation / Category Badge */}
          <div>
            {selectedMap ? (
              <Link
                href={backHref}
                className="group inline-flex items-center gap-2"
              >
                <div className="flex size-9 items-center justify-center clip-angular-sm bg-white/6 text-white/60 transition-colors group-hover:bg-val-red/20 group-hover:text-val-red">
                  <ArrowLeft size={16} />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 group-hover:text-white/50 transition-colors">
                  Back
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                {/* Custom Brand Logo */}
                <div className="flex size-9 items-center justify-center bg-foreground/7 clip-angular-sm shadow-[0_0_15px_rgba(255,70,85,0.35)] select-none">
                  
                </div>
                {/* Brand Text styled like the sync badge */}
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-val-red drop-shadow-[0_0_8px_rgba(255,70,85,0.5)]">
                  Agent Academy
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Symmetrical Live Sync Widget */}
          <div className="flex-shrink-0">
            <LiveSyncStatus />
          </div>
        </div>

        {/* Row 2: Page Content Title/Header Context */}
        <div className="mb-6">
          {selectedMap ? (
            selectedMap.imageUrl && (
              <div className="flex items-center gap-4 ">
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
                    <span className="text-val-red inline-flex leading-none">
                      //
                    </span>
                    <span>{selectedMap.name}</span>
                  </h2>
                </div>
              </div>
            )
          ) : (
            <h1 className="font-oswald text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
              Select <span className="text-val-red">Map</span>
            </h1>
          )}
        </div>

        {content}
      </div>
    );
  } catch (error) {
    console.error("Data fetch error:", error);
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex size-20 items-center justify-center clip-diamond bg-val-red/20">
          <span className="text-3xl">⚠</span>
        </div>
        <h1 className="font-oswald text-4xl font-bold uppercase text-white">
          Connection Error
        </h1>
        <p className="mt-4 max-w-md text-sm text-white/40">
          Could not connect to data sources. Make sure your Sanity project ID
          and dataset are correct.
        </p>
      </div>
    );
  }
}
