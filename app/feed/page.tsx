import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import PublicLineupFeed from "@/components/lineups/PublicLineupFeed";

export const metadata: Metadata = buildPageMetadata({
  title: "Feed",
  description: "Browse public lineups and add them to your collection.",
});

export default function FeedPage() {
  return (
    <main className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-oswald text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
            Public <span className="text-val-red">Feed</span>
          </h1>
          <p className="mt-2 text-sm text-white/45">
            Add public setups to your own map/agent collection.
          </p>
        </div>
      </header>

      <PublicLineupFeed />
    </main>
  );
}
