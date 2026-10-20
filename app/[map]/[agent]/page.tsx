import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LineupWorkspace from "@/components/lineups/LineupWorkspace";
import { findAgent, findMap, getAgents } from "@/lib/catalog/catalog";
import { buildPageMetadata } from "@/lib/metadata";
interface PageProps {
  params: Promise<{ map: string; agent: string }>;
}
export function generateStaticParams() {
  return getAgents().map((agent) => ({ agent: agent.slug!.current }));
}
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { map: mapSlug, agent: agentSlug } = await params;
  const map = findMap(mapSlug);
  const agent = findAgent(agentSlug);
  if (!map || !agent) return { title: "Lineup not found" };
  return buildPageMetadata({
    title: agent.name + " on " + map.name,
    description:
      agent.name + " lineups and ability setups for " + map.name + ".",
  });
}
export default async function LineupPage({ params }: PageProps) {
  const { map: mapSlug, agent: agentSlug } = await params;
  const map = findMap(mapSlug);
  const agent = findAgent(agentSlug);
  if (!map || !agent) notFound();
  return <LineupWorkspace agent={agent} map={map} />;
}
