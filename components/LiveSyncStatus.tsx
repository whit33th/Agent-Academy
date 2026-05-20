"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity } from "lucide-react";

interface SyncResponse {
  activeMapName?: string;
  activeMapSlug?: string | null;
  status: "offline" | "lobby" | "pregame" | "match";
  timestamp?: string;
  secondsSinceLastWrite?: number;
  message?: string;
  error?: string;
}

export default function LiveSyncStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMapSlug = searchParams.get("map");

  const [syncData, setSyncData] = useState<SyncResponse>({ status: "offline" });

  // Poll VALORANT log status every 5 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/detect-map");
        if (!res.ok) throw new Error("API error");
        const data: SyncResponse = await res.json();
        setSyncData(data);

        // Map Sync logic (Always Auto-Switch on new match detection)
        if (data.status === "match" && data.activeMapSlug && data.timestamp) {
          const mapSlug = data.activeMapSlug;
          const matchTs = data.timestamp;
          
          // Check if we already redirected for this specific match timestamp
          const lastRedirected = sessionStorage.getItem("val_picker_last_redirected_ts");

          if (currentMapSlug !== mapSlug && lastRedirected !== matchTs) {
            // Direct auto-redirect (only once per match timestamp)
            sessionStorage.setItem("val_picker_last_redirected_ts", matchTs);
            router.push(`/?map=${mapSlug}`);
          } else if (currentMapSlug === mapSlug && lastRedirected !== matchTs) {
            // Acknowledge if already on the correct map
            sessionStorage.setItem("val_picker_last_redirected_ts", matchTs);
          }
        }
      } catch (err) {
        console.error("Failed to check game sync status:", err);
        setSyncData({ status: "offline" });
      }
    };

    // Run immediately and then start interval
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [currentMapSlug, router]);

  const handleBadgeClick = () => {
    if (syncData.activeMapSlug) {
      router.push(`/?map=${syncData.activeMapSlug}`);
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (syncData.status) {
      case "match":
        return `Live: ${syncData.activeMapName || "Match"}`;
      case "pregame":
        return "Agent Select";
      case "lobby":
        return "In Lobby";
      case "offline":
      default:
        return "Sync Offline";
    }
  };

  // Get status color classes for the text label
  const getStatusColorClass = () => {
    if (syncData.status === "offline") {
      return "text-white/30";
    }
    return "text-val-red";
  };

  const isClickable = syncData.status === "match" && !!syncData.activeMapSlug;

  return (
    <div className="flex items-center gap-3">
      {/* Symmetrical status text label */}
      <span className={`text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors select-none ${getStatusColorClass()}`}>
        {getStatusText()}
      </span>

      {/* Symmetrical Square Button with mirrored left bottom crop */}
      <button
        onClick={handleBadgeClick}
        disabled={!isClickable}
        className={`flex size-9 items-center justify-center clip-angular-sm-left transition-all border-0 outline-none p-0 ${
          syncData.status !== "offline"
            ? isClickable
              ? "bg-white/6 text-val-red hover:bg-val-red/20 cursor-pointer active:scale-95"
              : "bg-white/6 text-val-red cursor-default"
            : "bg-white/6 text-white/60 opacity-60 cursor-default"
        }`}
        title={isClickable ? `Click to view setups for ${syncData.activeMapName}` : undefined}
      >
        <Activity
          size={16}
          style={
            syncData.status !== "offline"
              ? { filter: "drop-shadow(0 0 5px rgba(255, 70, 85, 0.75))" }
              : undefined
          }
          className={`${
            syncData.status !== "offline" ? "text-val-red animate-pulse" : "text-white/60"
          }`}
        />
      </button>
    </div>
  );
}
