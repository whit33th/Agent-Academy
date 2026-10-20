import { Layers3, Plus, Crosshair } from "lucide-react";
import Link from "next/link";
export default function PublicFeedEmptyState() {
  return (
    <section
      className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center"
      aria-label="Empty public feed"
    >
      <div
        className="relative mb-7 flex h-28 w-36 items-center justify-center"
        aria-hidden
      >
        <div className="absolute h-20 w-28 -rotate-12 rounded-sm border border-white/8 bg-val-surface" />
        <div className="absolute h-20 w-28 rotate-6 rounded-sm border border-white/12 bg-val-elevated" />
        <div className="relative grid h-20 w-28 place-items-center rounded-sm border border-val-red/30 bg-val-surface shadow-[0_0_45px_rgba(255,70,85,0.08)]">
          <Crosshair size={28} className="text-val-red/65" />
        </div>
        <span className="absolute -right-1 bottom-0 grid size-9 place-items-center rounded-sm border border-white/15 bg-val-elevated text-white/50">
          <Layers3 size={17} />
        </span>
      </div>
      <h2 className="font-oswald text-2xl font-semibold uppercase tracking-wide text-white">
        No public lineups yet
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/45">
        Share a setup from your collection to get things started.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-sm border border-white/12 bg-white/5 px-4 text-xs font-semibold text-white/75 transition-colors hover:border-val-red/40 hover:text-white"
      >
        <Plus size={14} />
        Open collection
      </Link>
    </section>
  );
}
