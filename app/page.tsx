import { Suspense } from "react";
import { getEnrichedMaps, getUnaddedMaps } from "@/lib/data/maps";
import MapGrid from "@/components/maps/MapGrid";
import BrandBadge from "@/components/layout/BrandBadge";
import LiveSyncStatus from "@/components/hud/LiveSyncStatus";
import AudioSettingsHUD from "@/components/AudioSettingsHUD";

export default function Home() {
  return (
    <main className="min-h-screen bg-val-bg p-4 md:p-6 lg:p-8">
      <header className="flex flex-row justify-between items-center w-full mb-4">
        <BrandBadge />
        <nav
          aria-label="Site controls"
          className="flex items-center gap-3 shrink-0"
        >
          <div className="hidden sm:flex items-center">
            <LiveSyncStatus />
          </div>
          <AudioSettingsHUD />
        </nav>
      </header>

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
