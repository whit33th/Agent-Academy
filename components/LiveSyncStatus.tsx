"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, X } from "lucide-react";

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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  // Poll status every 4 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        let data: SyncResponse;
        try {
          // 1. Try local companion port first (works on deployed site too!)
          const localRes = await fetch("http://127.0.0.1:23115/detect-map");
          if (!localRes.ok) throw new Error("Local companion offline");
          data = await localRes.json();
        } catch {
          // 2. Fallback to server route (works when testing locally)
          const res = await fetch("/api/detect-map");
          if (!res.ok) throw new Error("API error");
          data = await res.json();
        }

        setSyncData(data);

        // Map Sync logic (Always Auto-Switch on new match detection)
        if (data.status === "match" && data.activeMapSlug && data.timestamp) {
          const mapSlug = data.activeMapSlug;
          const matchTs = data.timestamp;
          
          const lastRedirected = sessionStorage.getItem("agent_academy_last_redirected_ts");

          if (currentMapSlug !== mapSlug && lastRedirected !== matchTs) {
            sessionStorage.setItem("agent_academy_last_redirected_ts", matchTs);
            router.push(`/?map=${mapSlug}`);
          } else if (currentMapSlug === mapSlug && lastRedirected !== matchTs) {
            sessionStorage.setItem("agent_academy_last_redirected_ts", matchTs);
          }
        }
      } catch (err) {
        console.error("Failed to check game sync status:", err);
        setSyncData({ status: "offline" });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [currentMapSlug, router]);

  const handleBadgeClick = () => {
    if (syncData.status === "offline") {
      setIsHelpModalOpen(true);
    } else if (syncData.activeMapSlug) {
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
      return "text-white/30 hover:text-white/50 cursor-pointer";
    }
    return "text-val-red";
  };

  const isClickable = syncData.status === "match" && !!syncData.activeMapSlug;

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Symmetrical status text label */}
        <span
          onClick={syncData.status === "offline" ? () => setIsHelpModalOpen(true) : undefined}
          className={`text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors select-none ${getStatusColorClass()}`}
        >
          {getStatusText()}
        </span>

        {/* Symmetrical Square Button with mirrored left bottom crop */}
        <button
          onClick={handleBadgeClick}
          className={`flex size-9 items-center justify-center clip-angular-sm-left transition-all border-0 outline-none p-0 cursor-pointer active:scale-95 ${
            syncData.status !== "offline"
              ? isClickable
                ? "bg-white/6 text-val-red hover:bg-val-red/20"
                : "bg-white/6 text-val-red cursor-default"
              : "bg-white/6 text-white/40 hover:bg-white/10 hover:text-white"
          }`}
          title={
            syncData.status === "offline"
              ? "How to activate auto sync?"
              : isClickable
              ? `Click to view setups for ${syncData.activeMapName}`
              : undefined
          }
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

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-md bg-val-surface border border-white/10 clip-angular overflow-hidden p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-oswald text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Activity size={18} className="text-val-red animate-pulse" />
                VALORANT Live Sync
              </h3>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Instruction Body */}
            <div className="flex flex-col gap-4 text-sm text-white/70">
              <p className="leading-relaxed">
                Чтобы задеплоенный сайт автоматически определял вашу карту в Valorant во время игры, запустите наш мини-автонастройщик.
              </p>
              
              <div className="flex flex-col gap-3 bg-black/40 p-4 rounded-sm border border-white/5">
                <span className="text-[10px] uppercase font-bold text-white/45 tracking-wider">
                  Шаг 1: Скачайте скрипт настройки
                </span>
                <a
                  href="/install-sync.bat"
                  download="install-sync.bat"
                  className="flex items-center justify-center gap-2 py-3 bg-val-red hover:bg-val-red-hover text-white font-bold uppercase tracking-wider text-xs rounded transition-all active:scale-98 select-none text-center"
                >
                  Скачать установщик (.bat)
                </a>
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-white/55 leading-relaxed list-decimal pl-4">
                <li>Запустите скачанный файл <strong>install-sync.bat</strong>.</li>
                <li>Если Windows SmartScreen покажет синее предупреждение, нажмите <strong>«Подробнее» (More info)</strong>, затем <strong>«Выполнить в любом случае» (Run anyway)</strong>.</li>
                <li>Скрипт автоматически создаст фоновую службу и настроит её автозагрузку с Windows.</li>
              </div>

              <p className="text-[10px] text-white/40 italic mt-1 leading-normal">
                * Установщик абсолютно прозрачен и состоит из нескольких строк открытого Node.js кода, который читает локальный лог Valorant и передает его сайту.
              </p>
            </div>игт

            {/* Actions */}
            <div className="flex border-t border-white/5 pt-4">
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all cursor-pointer font-bold uppercase tracking-wider text-xs text-center active:scale-95"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
