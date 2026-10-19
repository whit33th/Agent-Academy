"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { audio } from "@/lib/audio";
import { useGameSnapshot } from "@/lib/desktop/client";
import SyncHelpDialog from "./SyncHelpDialog";

export default function LiveSyncStatus() {
  const router = useRouter();
  const params = useParams<{ map?: string; agent?: string }>();
  const state = useGameSnapshot();
  const [helpOpen, setHelpOpen] = useState(false);
  const map = state?.mapSlug;
  const agent = state?.agentLocked ? state.agentSlug : null;
  const active = state?.gameRunning === true;
  const clickable = Boolean(active && map && ["pregame", "loading", "match"].includes(state?.phase ?? ""));
  useEffect(() => {
    if (!state?.gameRunning || state.sourceStatus !== "ready" || !state.sessionId || !state.mapSlug || !["pregame", "loading", "match"].includes(state.phase)) return;
    const key = `agent-academy:navigation:${state.sessionId}`;
    const previous = sessionStorage.getItem(key);
    const destination = state.agentLocked && state.agentSlug ? `/${state.mapSlug}/${state.agentSlug}` : `/${state.mapSlug}`;
    const first = !previous;
    const ownAgentArrived = previous === `/${state.mapSlug}` && Boolean(state.agentLocked && state.agentSlug) && params.map === state.mapSlug && !params.agent;
    if (!first && !ownAgentArrived) return;
    sessionStorage.setItem(key, destination);
    if (first) { try { audio.playMapFound(); } catch { /* Audio is optional. */ } }
    router.push(destination);
  }, [state, params.map, params.agent, router]);
  let label = "Sync Offline";
  if (state) {
    if (state.gameRunning === false) label = "Game closed";
    else if (state.gameRunning === null) label = state.sourceStatus === "initializing" ? "Connecting…" : "Game status unknown";
    else if (state.sourceStatus === "missing" || state.sourceStatus === "error") label = "Game running · sync unavailable";
    else if (state.phase === "menu") label = "In Lobby";
    else if (state.phase === "queue") label = "Finding match";
    else if (state.phase === "pregame") label = state.agentLocked ? `Locked: ${agent ?? "Agent"}` : "Agent select";
    else if (state.phase === "loading") label = `Loading${map ? `: ${map}` : ""}`;
    else if (state.phase === "match") label = `Live: ${map ?? "Match"}${agent ? ` (${agent})` : ""}`;
    else if (state.phase === "replay") label = "Watching replay";
    else label = "Game running";
  }
  const open = () => {
    if (!clickable || !map) { setHelpOpen(true); return; }
    try { audio.playMapFound(); } catch { /* Audio is optional. */ }
    router.push(agent ? `/${map}/${agent}` : `/${map}`);
  };
  return <>
    <div data-onboarding="live-sync" className="flex items-center gap-3">
      {!active ? <button type="button" onClick={() => setHelpOpen(true)} className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 hover:text-white/50 transition-colors select-none">{label}</button> : <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-val-red transition-colors select-none">{label}</span>}
      <button type="button" onClick={open} aria-label={clickable ? `Open ${map}` : "Game detection details"} className={`flex size-9 items-center relative justify-center clip-angular-sm-left transition-[scale,background-color,color] border-0 outline-none p-0 cursor-pointer active:scale-95 ${active ? clickable ? "bg-white/6 text-val-red hover:bg-val-red/20" : "bg-white/6 text-val-red cursor-default" : "bg-white/6 text-white/40 hover:bg-white/10 hover:text-white"}`}>
        <Image src="/valorant-icon.svg" alt="" width={36} height={36} style={active ? { filter: "drop-shadow(0 0 5px rgba(255, 70, 85, 0.75))" } : undefined} className={`w-full h-full bg-val-red p-1 object-contain ${active ? "animate-pulse" : ""}`} />
      </button>
    </div>
    <SyncHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} state={state} />
  </>;
}
