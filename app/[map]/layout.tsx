import { Suspense } from "react";
import { notFound } from "next/navigation";
import { findMap, getAgents, getMaps } from "@/lib/catalog/catalog";
import MapTitle from "@/components/layout/MapTitle";
import MapCollectionProgress from "@/components/layout/MapCollectionProgress";

export function generateStaticParams() {
  return getMaps().map((map) => ({ map: map._id }));
}
export default async function MapLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ map: string }>;
}) {
  const { map: slug } = await params;
  const map = findMap(slug);
  if (!map) notFound();
  return (
    <main className="relative min-h-screen p-4 md:p-6 lg:p-8">
      <section className="mb-6">
        <MapTitle map={map} />
        <MapCollectionProgress
          mapSlug={map._id}
          totalAgentsInGame={getAgents().length}
          mapName={map.name}
        />
      </section>
      <Suspense fallback={<div className="min-h-80" aria-busy="true" />}>
        {children}
      </Suspense>
    </main>
  );
}
