"use client";

import {
  Component,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { MotionConfig, motion } from "framer-motion";
import { BarChart3, ChevronRight, Clock3, ExternalLink, X } from "lucide-react";
import Link from "next/link";

const AgentLink = motion.create(Link);
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
const panelEase = [0.22, 1, 0.36, 1] as const;
const panelHidden = { x: "100%", opacity: 0, filter: "blur(8px)" };
const panelShown = { x: 0, opacity: 1, filter: "blur(0px)" };
const RANK_ICONS: Partial<Record<StatsDivision, string>> = {
  iron: "/ranks/iron.webp",
  bronze: "/ranks/bronze.webp",
  silver: "/ranks/silver.webp",
  gold: "/ranks/gold.webp",
  platinum: "/ranks/platinum.webp",
  diamond: "/ranks/diamond.webp",
  ascendant: "/ranks/ascendant.webp",
  immortal: "/ranks/immortal.webp",
  radiant: "/ranks/radiant.webp",
};

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
        aria-label="Tier list"
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
          Tier List
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
  const onClosedRef = useRef(onClosed);
  const openRef = useRef(open);
  onClosedRef.current = onClosed;
  openRef.current = open;
  useBodyScrollLock(open);
  useLayoutEffect(() => {
    const node = dialog.current;
    if (!node || !open) return;
    if (!node.open) node.showModal();
  }, [open]);
  useEffect(() => {
    const node = dialog.current;
    return () => node?.close();
  }, []);
  const empty = <CachedStats map={map} division={division} visible={open} />;
  return (
    <dialog
      ref={dialog}
      id="map-meta-drawer"
      aria-labelledby="map-meta-title"
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
      <MotionConfig reducedMotion="user">
        <motion.div
          className="map-meta-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.45, ease: panelEase }}
          onClick={onClose}
        />
        <div className="map-meta-slot">
          <motion.section
            className="map-meta-panel"
            aria-label="Map agent statistics"
            initial={panelHidden}
            animate={open ? panelShown : panelHidden}
            transition={{ duration: 0.5, ease: panelEase }}
            onAnimationComplete={() => {
              if (openRef.current) return;
              const node = dialog.current;
              if (!node?.open) return;
              node.close();
              onClosedRef.current();
            }}
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
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="map-meta-title"
                  className="min-w-0 font-oswald text-3xl font-semibold uppercase tracking-wide text-val-cream"
                >
                  Tier List
                </h2>
                <button
                  type="button"
                  autoFocus
                  onClick={onClose}
                  aria-label="Close tier list"
                  className="flex size-10 shrink-0 items-center justify-center text-white/45 transition-colors hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-val-teal"
                >
                  <X size={19} aria-hidden />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs text-white/35">
                  Agent performance · Last 14 days
                </p>
                <SelectField
                  label="Statistics rank"
                  value={division}
                  options={DIVISION_OPTIONS.map((option) => ({
                    ...option,
                    icon: RANK_ICONS[option.value],
                  }))}
                  onChange={(value) => writeStatsRank(scope, value)}
                  className="w-44 shrink-0"
                />
              </div>
            </header>
            <StatsBoundary key={`${map._id}:${division}`} fallback={empty}>
              {process.env.NEXT_PUBLIC_CONVEX_URL ? (
                <LiveStats
                  map={map}
                  division={division}
                  active={open}
                  visible={open}
                />
              ) : (
                empty
              )}
            </StatsBoundary>
          </motion.section>
        </div>
      </MotionConfig>
    </dialog>
  );
}

function LiveStats({
  map,
  division,
  active,
  visible,
}: {
  map: GameMap;
  division: StatsDivision;
  active: boolean;
  visible: boolean;
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
      visible={visible}
    />
  );
}

function CachedStats({
  map,
  division,
  visible,
}: {
  map: GameMap;
  division: StatsDivision;
  visible: boolean;
}) {
  const result = usePersistedValue<MapAgentStats>(
    `agent-stats:v1:${map._id}:${division}`,
    undefined,
    false,
    isMapAgentStats,
  );
  return (
    <StatsContent
      map={map}
      division={division}
      result={result}
      visible={visible}
    />
  );
}

function StatsContent({
  map,
  division,
  result,
  loading = false,
  offline = false,
  visible,
}: {
  map: GameMap;
  division: StatsDivision;
  result: MapAgentStats | undefined;
  loading?: boolean;
  offline?: boolean;
  visible: boolean;
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
                    key={`${division}:${stat.agentSlug}`}
                    stat={stat}
                    mapSlug={map._id}
                    index={index}
                    visible={visible}
                    featured
                  />
                ))}
              </div>
            </div>
            <div className="px-5 pb-6 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                Other agents
              </p>
              <div>
                {snapshot.agents.slice(3).map((stat, index) => (
                  <AgentStatCard
                    key={`${division}:${stat.agentSlug}`}
                    stat={stat}
                    mapSlug={map._id}
                    index={index + 3}
                    visible={visible}
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
  visible,
  featured = false,
}: {
  stat: AgentStat;
  mapSlug: string;
  index: number;
  visible: boolean;
  featured?: boolean;
}) {
  const agent = agents.get(stat.agentSlug);
  if (!agent) return null;
  const win = stat.nonMirroredWlPercentage;
  const positive = win >= 50;
  const width = Math.min(Math.abs(win - 50) * 5, 50);
  return (
    <AgentLink
      href={`/${mapSlug}/${stat.agentSlug}`}
      prefetch={false}
      className={`map-meta-agent group ${featured ? "map-meta-agent-featured" : ""}`}
      aria-label={`${agent.name}, Win rate ${win.toFixed(1)}%, Pick rate ${stat.pickRate.toFixed(1)}%`}
      initial={{ opacity: 0, x: -18 }}
      animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
      transition={{
        duration: 0.22,
        delay: visible ? Math.min(index, 10) * 0.045 : 0,
        ease: panelEase,
      }}
    >
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
    </AgentLink>
  );
}
