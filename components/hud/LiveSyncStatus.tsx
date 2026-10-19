"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { audio } from "@/lib/audio";
import { useGameSnapshot } from "@/lib/desktop/client";
import { syncStatusLabel } from "@/lib/desktop/status-label";
import type { GameSnapshot } from "@/lib/desktop/protocol";
import SyncHelpDialog from "./SyncHelpDialog";

const LIVE_PHASES = ["pregame", "loading", "match"];

function isLivePhase(phase?: string) {
  return LIVE_PHASES.includes(phase ?? "");
}

function followLiveSession(
  state: GameSnapshot | null,
  params: { map?: string; agent?: string },
  push: (href: string) => void,
) {
  if (!state?.gameRunning || state.sourceStatus !== "ready" || !state.sessionId || !state.mapSlug || !isLivePhase(state.phase)) return;
  const key = `agent-academy:navigation:${state.sessionId}`;
  const previous = sessionStorage.getItem(key);
  const destination = state.agentLocked && state.agentSlug ? `/${state.mapSlug}/${state.agentSlug}` : `/${state.mapSlug}`;
  const first = !previous;
  const ownAgentArrived = previous === `/${state.mapSlug}` && Boolean(state.agentLocked && state.agentSlug) && params.map === state.mapSlug && !params.agent;
  if (!first && !ownAgentArrived) return;
  sessionStorage.setItem(key, destination);
  if (first) {
    try { audio.playMapFound(); } catch { /* Audio is optional. */ }
  }
  push(destination);
}

function LiveSyncIcon({ active }: { active: boolean }) {
  return (
    <Image src="/valorant-icon.svg" alt="" width={36} height={36} style={active ? { filter: "drop-shadow(0 0 5px rgba(255, 70, 85, 0.75))" } : undefined} className={`size-full bg-val-red p-1 object-contain ${active ? "animate-pulse" : ""}`} />
  );
}

export default function LiveSyncStatus({ chrome = false }: { chrome?: boolean }) {
  const router = useRouter();
  const params = useParams<{ map?: string; agent?: string }>();
  const state = useGameSnapshot();
  const [helpOpen, setHelpOpen] = useState(false);
  const map = state?.mapSlug;
  const agent = state?.agentLocked ? state.agentSlug : null;
  const active = state?.gameRunning === true;
  const clickable = Boolean(active && map && isLivePhase(state?.phase));

  useEffect(() => {
    followLiveSession(state, params, (href) => {
      // react-doctor-disable-next-line react-doctor/nextjs-no-client-side-redirect -- follow the live Valorant session once the desktop snapshot names the map
      router.push(href);
    });
  }, [state, params, router]);

  const label = syncStatusLabel(state);
  const open = () => {
    if (!clickable || !map) {
      setHelpOpen(true);
      return;
    }
    try { audio.playMapFound(); } catch { /* Audio is optional. */ }
    router.push(agent ? `/${map}/${agent}` : `/${map}`);
  };

  return (
    <>
      {chrome ? <LiveSyncChrome label={label} active={active} onOpen={open} /> : <LiveSyncInline label={label} active={active} clickable={clickable} map={map} onOpen={open} onHelp={() => setHelpOpen(true)} />}
      <SyncHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} state={state} />
    </>
  );
}

function LiveSyncChrome({ label, active, onOpen }: { label: string; active: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} title={label} aria-label={label} data-onboarding="live-sync" className="flex h-full min-w-0 items-center gap-2 pl-2 pr-1.5">
      <span className="titlebar-status max-w-[14rem] truncate font-oswald text-[11px] font-semibold uppercase tracking-[0.14em] text-val-red">{label}</span>
      <span className={`flex size-8 shrink-0 items-center justify-center overflow-hidden clip-angular-sm-left ${active ? "" : "opacity-60"}`}>
        <LiveSyncIcon active={active} />
      </span>
    </button>
  );
}

function LiveSyncInline({ label, active, clickable, map, onOpen, onHelp }: { label: string; active: boolean; clickable: boolean; map?: string | null; onOpen: () => void; onHelp: () => void }) {
  const tone = active
    ? clickable
      ? "bg-white/6 text-val-red hover:bg-val-red/20"
      : "bg-white/6 text-val-red cursor-default"
    : "bg-white/6 text-white/40 hover:bg-white/10 hover:text-white";
  return (
    <div data-onboarding="live-sync" className="flex items-center gap-3">
      {active ? <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-val-red transition-colors select-none">{label}</span> : <button type="button" onClick={onHelp} className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 hover:text-white/50 transition-colors select-none">{label}</button>}
      <button type="button" onClick={onOpen} aria-label={clickable ? `Open ${map}` : "Game detection details"} className={`flex size-9 items-center relative justify-center clip-angular-sm-left transition-[scale,background-color,color] border-0 outline-none p-0 cursor-pointer active:scale-95 ${tone}`}>
        <LiveSyncIcon active={active} />
      </button>
    </div>
  );
}
