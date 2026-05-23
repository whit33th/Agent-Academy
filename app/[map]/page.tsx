import { Suspense } from "react";
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

export default function MapAgentsPage({ params }: PageProps) {
  return (
    <Suspense fallback={<AgentGridSkeleton />}>
      <MapAgentsContent params={params} />
    </Suspense>
  );
}

async function MapAgentsContent({ params }: PageProps) {
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

function AgentGridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="skeleton clip-angular border border-white/4 h-[340px]"
        />
      ))}
    </div>
  );
}
