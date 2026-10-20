import type { Metadata } from "next";
import { getMaps } from "@/lib/catalog/catalog";
import { buildPageMetadata } from "@/lib/metadata";
import MapGrid from "@/components/maps/MapGrid";

export const metadata: Metadata = buildPageMetadata({
  title: "Select Map",
  description:
    "Browse Valorant maps and tactical agent lineups — smokes, flashes, and post-plants.",
});
export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <section className="mb-6">
        <h1 className="font-oswald text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
          Select <span className="text-val-red">Map</span>
        </h1>
      </section>
      <MapGrid maps={getMaps()} />
    </main>
  );
}
