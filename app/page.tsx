import {
  getEnrichedMaps,
  getEnrichedAgents,
  getAgentsForMap,
  getScreenshots,
} from "@/lib/data";
import type { GameMap, Agent } from "@/lib/types";
import MapHeader from "@/components/MapHeader";
import MapGrid from "@/components/MapGrid";
import AgentGrid from "@/components/AgentGrid";
import LineupViewer from "@/components/LineupViewer";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const mapSlug = params.map;
  const agentSlug = params.agent;

  try {
    const [maps, agents] = await Promise.all([
      getEnrichedMaps(),
      getEnrichedAgents(),
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
    } else if (selectedMapId) {
      // State 2: Map selected → show agent grid for this map
      const mapAgents = await getAgentsForMap(selectedMapId);
      const agentList = mapAgents.length > 0 ? mapAgents : agents;
      content = <AgentGrid agents={agentList} selectedMapSlug={mapSlug} />;
    } else {
      // State 1: Nothing selected → show map grid
      content = <MapGrid maps={maps} agentCount={agents.length} />;
    }

    const backHref = selectedAgentId ? `/?map=${mapSlug}` : "/";

    return (
      <div className="min-h-screen bg-val-bg p-4 md:p-6 lg:p-8">
        {selectedMap && (
          <MapHeader selectedMap={selectedMap} backHref={backHref} />
        )}
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
