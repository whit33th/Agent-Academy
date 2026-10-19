"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import CopyLineupButton from "./CopyLineupButton";
import LineupImage from "./LineupImage";
export default function FeedGrid({ initialRows }: { initialRows: FunctionReturnType<typeof api.lineups.listPublicFeed> }) {
  const rows = useQuery(api.lineups.listPublicFeed, { limit: 60 }) ?? initialRows;
  if (!rows.length) return <div className="py-16 text-center text-white/45">No public lineups yet.</div>;
  return <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">{rows.map((l, i) => <article key={l._id} className="val-card group relative block w-full clip-angular bg-val-surface text-left overflow-hidden border border-white/5">
    <div className="relative aspect-video bg-black/30">{l.imageUrl ? <LineupImage src={l.imageUrl} alt={l.title} fill className="object-contain" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" priority={i < 2} /> : null}</div>
    <div className="p-3 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-white truncate">{l.title}</p><p className="mt-1 text-[11px] text-white/35 font-mono uppercase tracking-wider truncate">{l.mapSlug} / {l.agentSlug} · {l.abilityType}</p></div><CopyLineupButton id={l._id} mapSlug={l.mapSlug} agentSlug={l.agentSlug} /></div>
  </article>)}</section>;
}
