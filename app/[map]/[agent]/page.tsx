import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { findMap } from "@/lib/data/maps";
import { findAgent } from "@/lib/data/agents";
import { getScreenshots } from "@/lib/data/screenshots";
import LineupViewer from "@/components/lineups/LineupViewer";
import type { GameMap, Agent } from "@/lib/types";

interface PageProps {
  params: Promise<{ map: string; agent: string }>;
}

export default async function LineupPage({ params }: PageProps) {
  const { map: mapSlug, agent: agentSlug } = await params;
  const [map, agent] = await Promise.all([
    findMap(mapSlug),
    findAgent(agentSlug),
  ]);
  if (!map || !agent) notFound();

  return (
    <Suspense fallback={<LineupSkeleton />}>
      <AgentHero agent={agent} />
      <LineupSection map={map} agent={agent} />
    </Suspense>
  );
}

function AgentHero({ agent }: { agent: Agent }) {
  if (!agent.artBackground) return null;
  return (
    <Image
      src={agent.artBackground}
      alt={`${agent.name.toLowerCase()} background`}
      width={24}
      height={24}
      className="object-cover inset-0 w-full h-full brightness-100 absolute object-center -z-1 blur-2xl"
      priority
    />
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
