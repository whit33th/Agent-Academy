"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { audio } from "@/lib/audio";
import SyncHelpDialog from "./SyncHelpDialog";

type SyncStatus = "offline" | "lobby" | "pregame" | "match";

interface SyncResponse {
  activeMapName?: string;
  activeMapSlug?: string | null;
  activeAgentSlug?: string | null;
  status: SyncStatus;
  timestamp?: string;
  secondsSinceLastWrite?: number;
}

const ONLINE_INTERVAL_MS = 4000;
const OFFLINE_INTERVAL_MS = 8000;

function canUseLocalCompanion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

async function tryFetch(url: string, timeoutMs = 1800): Promise<SyncResponse> {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Sync ${res.status}`);
    return (await res.json()) as SyncResponse;
  } finally {
    window.clearTimeout(t);
  }
}

async function fetchSyncStatus(): Promise<SyncResponse> {
  if (canUseLocalCompanion()) {
    try {
      return await tryFetch("http://127.0.0.1:23115/detect-map");
    } catch {
      // fall through to server route
    }
  }
  return tryFetch("/api/detect-map", 3000);
}

export default function LiveSyncStatus() {
  const router = useRouter();
  const params = useParams<{ map?: string; agent?: string }>();
  const currentMapSlug = params.map ?? null;
  const currentAgentSlug = params.agent ?? null;
  const [data, setData] = useState<SyncResponse>({ status: "offline" });
  const [helpOpen, setHelpOpen] = useState(false);

  // Refs avoid re-creating the polling loop on every status / route change.
  const statusRef = useRef<SyncStatus>("offline");
  const navRef = useRef({ currentMapSlug, currentAgentSlug });
  useEffect(() => {
    statusRef.current = data.status;
  }, [data.status]);
  useEffect(() => {
    navRef.current = { currentMapSlug, currentAgentSlug };
  }, [currentMapSlug, currentAgentSlug]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const next = await fetchSyncStatus();
        if (cancelled) return;
        setData(next);

        const isActive = next.status === "pregame" || next.status === "match";
        if (isActive && next.activeMapSlug && next.timestamp) {
          const mapSlug = next.activeMapSlug;
          const matchTs = next.timestamp;
          const agentSlug =
            next.status === "match" ? next.activeAgentSlug : null;
          const lastMapTs = sessionStorage.getItem("agent_academy_last_map_ts");
          const lastAgentTs = sessionStorage.getItem(
            "agent_academy_last_agent_ts",
          );
          const { currentMapSlug: curMap, currentAgentSlug: curAgent } =
            navRef.current;

          if (lastMapTs !== matchTs) {
            sessionStorage.setItem("agent_academy_last_map_ts", matchTs);
            sessionStorage.removeItem("agent_academy_last_agent_ts");
            try {
              audio.playMapFound();
            } catch {
              /* ignore */
            }
            if (agentSlug) {
              sessionStorage.setItem("agent_academy_last_agent_ts", matchTs);
              router.push(`/${mapSlug}/${agentSlug}`);
            } else {
              router.push(`/${mapSlug}`);
            }
          } else if (
            agentSlug &&
            lastAgentTs !== matchTs &&
            curMap === mapSlug &&
            !curAgent
          ) {
            sessionStorage.setItem("agent_academy_last_agent_ts", matchTs);
            router.push(`/${mapSlug}/${agentSlug}`);
          }
        }
      } catch {
        if (!cancelled) setData({ status: "offline" });
      } finally {
        if (cancelled) return;
        const interval =
          statusRef.current === "offline"
            ? OFFLINE_INTERVAL_MS
            : ONLINE_INTERVAL_MS;
        timer = setTimeout(tick, interval);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  const handleBadgeClick = () => {
    if (data.status === "offline") {
      setHelpOpen(true);
      return;
    }
    if (!data.activeMapSlug) return;
    try {
      audio.playMapFound();
    } catch {
      /* ignore */
    }
    if (data.status === "match" && data.activeAgentSlug) {
      router.push(`/${data.activeMapSlug}/${data.activeAgentSlug}`);
    } else {
      router.push(`/${data.activeMapSlug}`);
    }
  };

  const statusLabel = (() => {
    switch (data.status) {
      case "match": {
        let text = `Live: ${data.activeMapName ?? "Match"}`;
        if (data.activeAgentSlug) {
          const agentName =
            data.activeAgentSlug.charAt(0).toUpperCase() +
            data.activeAgentSlug.slice(1);
          text += ` (${agentName})`;
        }
        return text;
      }
      case "pregame":
        return `Select: ${data.activeMapName ?? "Map"}`;
      case "lobby":
        return "In Lobby";
      default:
        return "Sync Offline";
    }
  })();

  const isClickable =
    (data.status === "match" || data.status === "pregame") &&
    !!data.activeMapSlug;

  return (
    <>
      <div className="flex items-center gap-3">
        {data.status === "offline" ? (
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 hover:text-white/50 transition-colors select-none"
          >
            {statusLabel}
          </button>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-val-red transition-colors select-none">
            {statusLabel}
          </span>
        )}

        <button
          type="button"
          onClick={handleBadgeClick}
          aria-label={
            data.status === "offline"
              ? "How to activate auto sync?"
              : isClickable
                ? `Open ${data.activeMapName}`
                : "Sync active"
          }
          className={`flex size-9 items-center relative justify-center clip-angular-sm-left transition-[scale,background-color,color] border-0 outline-none p-0 cursor-pointer active:scale-95 ${
            data.status !== "offline"
              ? isClickable
                ? "bg-white/6 text-val-red hover:bg-val-red/20"
                : "bg-white/6 text-val-red cursor-default"
              : "bg-white/6 text-white/40 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Image
            src="/valorant-icon.svg"
            alt=""
            width={36}
            height={36}
            style={
              data.status !== "offline"
                ? { filter: "drop-shadow(0 0 5px rgba(255, 70, 85, 0.75))" }
                : undefined
            }
            className={`w-full h-full bg-val-red p-1 object-contain ${
              data.status !== "offline" ? "animate-pulse" : ""
            }`}
          />
        </button>
      </div>

      <SyncHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
