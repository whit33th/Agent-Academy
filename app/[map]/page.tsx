import { notFound } from "next/navigation";
import { findMap } from "@/lib/data/maps";
import {
  getAgentsForMap,
  getAllApiAgents,
  getUnaddedAgentsForMap,
} from "@/lib/data/agents";
import AgentGrid from "@/components/agents/AgentGrid";

interface PageProps {
  params: Promise<{ map: string }>;
}

export default async function MapAgentsPage({ params }: PageProps) {
  const { map: mapSlug } = await params;
  const map = await findMap(mapSlug);
  if (!map) notFound();

  const [mapAgents, allApiAgents, unaddedAgents] = await Promise.all([
    getAgentsForMap(map._id),
    getAllApiAgents(),
    getUnaddedAgentsForMap(map._id),
  ]);

  return (
    <AgentGrid
      mapAgents={mapAgents}
      allApiAgents={allApiAgents}
      unaddedAgents={unaddedAgents}
      mapSlug={map.slug?.current ?? map._id}
      mapId={map._id}
    />
  );
}
