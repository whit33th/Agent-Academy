import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buildPageMetadata } from "@/lib/metadata";
import { fetchPublicLineupsFeed } from "@/lib/data/convex-fetch";
import FeedGrid from "@/components/lineups/FeedGrid";

export const metadata: Metadata = buildPageMetadata({
  title: "Feed",
  description: "Browse public lineups and add them to your collection.",
  path: "/feed",
});

export default function FeedPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-oswald text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
            Public <span className="text-val-red">Feed</span>
          </h1>
          <p className="mt-2 text-sm text-white/45">
            Add public setups to your own map/agent collection.
          </p>
        </div>
        <Link
          href="/"
          className="px-3 py-2 rounded-sm border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          Back
        </Link>
      </header>

      <Suspense fallback={<FeedSkeleton />}>
        <FeedContent />
      </Suspense>
    </main>
  );
}

async function FeedContent() {
  const rows = await fetchPublicLineupsFeed(60);

  return <FeedGrid initialRows={rows} />;
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton aspect-video clip-angular" />
      ))}
    </div>
  );
}

