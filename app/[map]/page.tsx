import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findMap, getAgents } from "@/lib/catalog/catalog";
import { buildPageMetadata } from "@/lib/metadata";
import AgentGrid from "@/components/agents/AgentGrid";
interface PageProps {
  params: Promise<{ map: string }>;
}
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { map: slug } = await params;
  const map = findMap(slug);
  if (!map) return { title: "Map not found" };
  return buildPageMetadata({
    title: map.name + " Lineups",
    description:
      "Agent lineups and tactical setups for " + map.name + " in Valorant.",
  });
}
export default async function MapAgentsPage({ params }: PageProps) {
  const { map: slug } = await params;
  const map = findMap(slug);
  if (!map) notFound();
  return <AgentGrid agents={getAgents()} mapSlug={map._id} />;
}
