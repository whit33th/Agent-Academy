"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import {
  BarChart3,
  ChevronRight,
  Clock3,
  ExternalLink,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useAppSession } from "@/components/auth/SessionProvider";
import Image from "@/components/ui/CatalogImage";
import SelectField from "@/components/ui/SelectField";
import { usePersistedValue } from "@/lib/collection/usePersistedValue";
import { useCollectionConnection } from "@/lib/collection/useCollectionConnection";
import { useBodyScrollLock } from "@/lib/utils/body-scroll-lock";
import { getAgents } from "@/lib/catalog/catalog";
import {
  DIVISION_OPTIONS,
  STALE_AFTER,
  isMapAgentStats,
  supportsStats,
  trackerUrl,
  type AgentStat,
  type MapAgentStats,
  type StatsDivision,
} from "@/lib/agent-stats/model";
import {
  readStatsRank,
  writeStatsRank,
  subscribeStatsRank,
} from "@/lib/agent-stats/preferences";
import type { GameMap } from "@/lib/types";
import "./map-meta.css";

const agents = new Map(
  getAgents().map((agent) => [agent.slug!.current, agent]),
);
const defaultRank = () => "all" as const;

class StatsBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function MapMetaButton({ map }: { map: GameMap }) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!supportsStats(map._id)) return null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Мета карты"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="map-meta-drawer"
        onClick={() => {
          setVisited(true);
          setOpen((value) => !value);
        }}
        className="map-meta-trigger inline-flex h-10 shrink-0 items-center gap-2 border border-white/10 bg-white/4 px-3 text-val-cream/80 transition-colors hover:border-val-teal/35 hover:bg-val-teal/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-val-teal"
      >
        <BarChart3 size={15} className="text-val-teal" aria-hidden />
        <span className="hidden font-oswald text-xs font-semibold uppercase tracking-[0.12em] sm:inline">
          Мета карты
        </span>
      </button>
      {visited && (
        <MetaDrawer
          key={map._id}
          map={map}
          open={open}
          onClose={() => setOpen(false)}
          onClosed={() => trigger.current?.focus()}
        />
      )}
    </>
  );
}

function MetaDrawer({
  map,
  open,
  onClose,
  onClosed,
}: {
  map: GameMap;
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { subject } = useAppSession();
  const scope = subject || "guest";
  const division = useSyncExternalStore(
    subscribeStatsRank,
    () => readStatsRank(scope),
    defaultRank,
  );
  useBodyScrollLock(open);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      if (!node.open) node.showModal();
      frame = requestAnimationFrame(() => {
        node.dataset.state = "open";
      });
    } else if (node.open) {
      node.dataset.state = "closed";
      const finish = () => {
        node.close();
        onClosed();
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        finish();
      else timer = setTimeout(finish, 100);
    }
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open, onClosed]);
  useEffect(() => {
    const node = dialog.current;
    return () => node?.close();
  }, []);
  const empty = <CachedStats map={map} division={division} />;
  return (
    <dialog
      ref={dialog}
      id="map-meta-drawer"
      aria-labelledby="map-meta-title"
      data-state="closed"
      className="map-meta-dialog"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="map-meta-panel"
        aria-label="Map agent statistics"
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target
              .closest("a")
              ?.getAttribute("href")
              ?.startsWith(`/${map._id}/`)
          )
            onClose();
        }}
      >
        <header className="map-meta-header">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-val-teal">
              <TrendingUp size={13} aria-hidden /> Competitive · Europe
            </span>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label="Close map meta"
              className="flex size-10 items-center justify-center text-white/45 transition-colors hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-val-teal"
            >
              <X size={19} aria-hidden />
            </button>
          </div>
          <div className="mt-1 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Мета карты
              </p>
              <h2
                id="map-meta-title"
                className="mt-1 font-oswald text-4xl font-semibold uppercase tracking-wide text-val-cream"
              >
                {map.name}
              </h2>
            </div>
            <SelectField
              label="Statistics rank"
              value={division}
              options={DIVISION_OPTIONS}
              onChange={(value) => writeStatsRank(scope, value)}
              className="w-40 shrink-0"
            />
          </div>
          <p className="mt-4 text-xs text-white/35">
            Agent performance · Last 14 days
          </p>
        </header>
        <StatsBoundary key={`${map._id}:${division}`} fallback={empty}>
          {process.env.NEXT_PUBLIC_CONVEX_URL ? (
            <LiveStats map={map} division={division} active={open} />
          ) : (
            empty
          )}
        </StatsBoundary>
      </section>
    </dialog>
  );
}

function LiveStats({
  map,
  division,
  active,
}: {
  map: GameMap;
  division: StatsDivision;
  active: boolean;
}) {
  const { unavailable } = useCollectionConnection();
  const live = useQuery(
    api.agentStats.getByMap,
    active ? { mapSlug: map._id, division } : "skip",
  );
  const result = usePersistedValue(
    `agent-stats:v1:${map._id}:${division}`,
    live,
    false,
    isMapAgentStats,
  );
  return (
    <StatsContent
      map={map}
      division={division}
      result={result}
      loading={active && !result && !unavailable}
      offline={unavailable}
    />
  );
}

function CachedStats({
  map,
  division,
}: {
  map: GameMap;
  division: StatsDivision;
}) {
  const result = usePersistedValue<MapAgentStats>(
    `agent-stats:v1:${map._id}:${division}`,
    undefined,
    false,
    isMapAgentStats,
  );
  return <StatsContent map={map} division={division} result={result} />;
}

function StatsContent({
  map,
  division,
  result,
  loading = false,
  offline = false,
}: {
  map: GameMap;
  division: StatsDivision;
  result: MapAgentStats | undefined;
  loading?: boolean;
  offline?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  // Never allow cached data from a different map or rank to flash during navigation.
  const scopedResult =
    result?.mapSlug === map._id && result.division === division
      ? result
      : undefined;
  const snapshot = scopedResult?.snapshot;
  const updatedAt = snapshot?.fetchedAt ?? scopedResult?.lastCheckedAt;
  const stale = updatedAt != null && now - updatedAt > STALE_AFTER;
  return (
    <>
      <div className="map-meta-scroll" aria-busy={loading}>
        {stale && (
          <p
            className="mx-5 mt-4 flex items-center gap-2 text-xs text-val-gold"
            role="status"
          >
            <Clock3 size={13} /> Data may be outdated
          </p>
        )}
        {snapshot ? (
          <>
            <div className="px-5 pb-2 pt-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Leading this map
              </p>
              <div className="space-y-2">
                {snapshot.agents.slice(0, 3).map((stat, index) => (
                  <AgentStatCard
                    key={stat.agentSlug}
                    stat={stat}
                    mapSlug={map._id}
                    index={index}
                    featured
                  />
                ))}
              </div>
            </div>
            <div className="px-5 pb-6 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                All agents
              </p>
              <div>
                {snapshot.agents.slice(3).map((stat, index) => (
                  <AgentStatCard
                    key={stat.agentSlug}
                    stat={stat}
                    mapSlug={map._id}
                    index={index + 3}
                  />
                ))}
              </div>
            </div>
          </>
        ) : loading ? (
          <div
            className="space-y-3 p-5 motion-safe:animate-pulse"
            role="status"
            aria-label="Loading agent statistics"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white/4" />
            ))}
          </div>
        ) : (
          <div
            className="flex min-h-64 flex-col items-center justify-center px-8 text-center"
            role="status"
          >
            <BarChart3 size={30} className="mb-4 text-white/15" aria-hidden />
            <p className="font-oswald text-xl uppercase tracking-wide text-white/75">
              {offline && !scopedResult
                ? "Saved stats unavailable"
                : scopedResult?.status === "no_data"
                  ? "No recent matches"
                  : "Stats coming soon"}
            </p>
            <p className="mt-2 max-w-64 text-sm leading-relaxed text-white/35">
              {offline && !scopedResult
                ? "Connect to load statistics for this map and rank."
                : scopedResult?.status === "no_data"
                  ? "No statistics are available for this map and rank in the current period."
                  : "Statistics will appear here after the next successful update."}
            </p>
          </div>
        )}
      </div>
      <footer className="map-meta-footer">
        <div className="min-w-0 text-[10px] text-white/35">
          <p>Updated daily</p>
          {updatedAt != null && (
            <time
              dateTime={new Date(updatedAt).toISOString()}
              className="mt-0.5 block tabular-nums"
            >
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(updatedAt)}
            </time>
          )}
        </div>
        <a
          href={trackerUrl(map._id, division)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 text-xs text-white/45 transition-colors hover:text-val-teal"
        >
          Tracker.gg <ExternalLink size={12} aria-hidden />
        </a>
      </footer>
    </>
  );
}

function AgentStatCard({
  stat,
  mapSlug,
  index,
  featured = false,
}: {
  stat: AgentStat;
  mapSlug: string;
  index: number;
  featured?: boolean;
}) {
  const agent = agents.get(stat.agentSlug);
  if (!agent) return null;
  const win = stat.nonMirroredWlPercentage;
  const positive = win >= 50;
  const width = Math.min(Math.abs(win - 50) * 5, 50);
  return (
    <Link
      href={`/${mapSlug}/${stat.agentSlug}`}
      prefetch={false}
      className={`map-meta-agent group ${featured ? "map-meta-agent-featured" : ""}`}
      aria-label={`${agent.name}, Win rate ${win.toFixed(1)}%, Pick rate ${stat.pickRate.toFixed(1)}%`}
    >
      <span className="w-4 shrink-0 text-[10px] tabular-nums text-white/25">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div
        className={`relative shrink-0 overflow-hidden ${featured ? "size-14" : "size-10"}`}
      >
        {agent.displayIcon && (
          <Image
            src={agent.displayIcon}
            alt=""
            fill
            sizes="56px"
            className="object-contain"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate font-oswald font-medium uppercase tracking-wide ${featured ? "text-lg" : "text-base"}`}
          >
            {agent.name}
          </span>
          <span
            className={`map-meta-tier map-meta-tier-${stat.tier.toLowerCase()}`}
          >
            {stat.tier}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] tabular-nums text-white/35">
          Pick rate{" "}
          <span className="text-white/65">{stat.pickRate.toFixed(1)}%</span>
        </p>
      </div>
      <div className="w-[76px] shrink-0 text-right">
        <p
          className={`font-oswald font-medium tabular-nums leading-none ${featured ? "text-2xl" : "text-xl"} ${positive ? "text-val-teal" : "text-white/65"}`}
        >
          {win.toFixed(1)}
          <span className="ml-0.5 text-xs opacity-60">%</span>
        </p>
        <span className="mt-1 block text-[8px] uppercase tracking-[0.1em] text-white/30">
          Win rate
        </span>
        <div className="relative mt-2 h-0.5 bg-white/6" aria-hidden>
          <span className="absolute -top-0.5 left-1/2 h-1.5 w-px bg-white/30" />
          <span
            className={`absolute top-0 h-full ${positive ? "bg-val-teal/80" : "bg-val-red/65"}`}
            style={{
              left: `${positive ? 50 : 50 - width}%`,
              width: `${width}%`,
            }}
          />
        </div>
      </div>
      <ChevronRight
        size={12}
        className="shrink-0 text-white/15 transition-colors group-hover:text-val-teal"
        aria-hidden
      />
    </Link>
  );
}
