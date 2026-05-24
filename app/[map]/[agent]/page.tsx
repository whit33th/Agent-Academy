import LineupViewer from "@/components/lineups/LineupViewer";
import { findAgent } from "@/lib/data/agents";
import { findMap } from "@/lib/data/maps";
import { getScreenshots } from "@/lib/data/screenshots";
import type { Agent, GameMap } from "@/lib/types";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ map: string; agent: string }>;
}

export default function LineupPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LineupSkeleton />}>
      <LineupContent params={params} />
    </Suspense>
  );
}

async function LineupContent({ params }: PageProps) {
  const { map: mapSlug, agent: agentSlug } = await params;
  const [map, agent] = await Promise.all([
    findMap(mapSlug),
    findAgent(agentSlug),
  ]);
  if (!map || !agent) notFound();

  return (
    <>
      {/* {agent.artBackground && (
        <Image
          src={agent.artBackground}
          alt={`${agent.name.toLowerCase()} background`}
          width={24}
          height={24}
          className="object-cover inset-0 w-full h-full brightness-50 opacity-15 absolute object-center -z-1 blur-2xl"
          priority
        />
      )} */}
      <LineupSection map={map} agent={agent} />
    </>
  );
}

async function LineupSection({ map, agent }: { map: GameMap; agent: Agent }) {
  const screenshots = await getScreenshots(map._id, agent._id);
  return <LineupViewer screenshots={screenshots} agent={agent} map={map} />;
}

function LineupSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton aspect-video clip-angular" />
      ))}
    </div>
  );
}
