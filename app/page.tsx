import type { Metadata } from "next";
import { Suspense } from "react";
import { getEnrichedMaps, getUnaddedMaps } from "@/lib/data/maps";
import { buildPageMetadata } from "@/lib/metadata";
import MapGrid from "@/components/maps/MapGrid";
import PageChrome from "@/components/layout/PageChrome";
import AuthButton from "@/components/auth/AuthButton";
import AudioSettingsHUD from "@/components/AudioSettingsHUD";

export const metadata: Metadata = buildPageMetadata({
  title: "Select Map",
  description:
    "Browse Valorant maps and tactical agent lineups — smokes, flashes, and post-plants.",
  path: "/",
});

export default function Home() {
  return (
    <main className="min-h-screen bg-val-bg p-4 md:p-6 lg:p-8">
      <Suspense fallback={null}>
        <PageChrome>
          <AuthButton />
          <AudioSettingsHUD />
        </PageChrome>
      </Suspense>

      <section className="mb-6">
        <h1 className="font-oswald text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
          Select <span className="text-val-red">Map</span>
        </h1>
      </section>

      <Suspense fallback={<MapsGridSkeleton />}>
        <MapsSection />
      </Suspense>
    </main>
  );
}

async function MapsSection() {
  const [maps, unaddedMaps] = await Promise.all([
    getEnrichedMaps(),
    getUnaddedMaps(),
  ]);
  return <MapGrid maps={maps} unaddedMaps={unaddedMaps} />;
}

function MapsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="skeleton clip-angular aspect-video bg-val-surface border border-white/4"
        />
      ))}
    </div>
  );
}
