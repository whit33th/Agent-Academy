"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Music } from "lucide-react";
import { audio } from "@/lib/audio";

export default function AudioSettingsHUD({ chrome = false }: { chrome?: boolean }) {
  const ambientEnabled = useSyncExternalStore(
    (onStoreChange) => audio.subscribe(onStoreChange),
    () => audio.isAmbientEnabled(),
    () => false,
  );

  useEffect(() => {
    const initOnGesture = () => {
      audio.init();
      window.removeEventListener("pointerdown", initOnGesture);
      window.removeEventListener("click", initOnGesture);
    };

    window.addEventListener("pointerdown", initOnGesture);
    window.addEventListener("click", initOnGesture);

    return () => {
      window.removeEventListener("pointerdown", initOnGesture);
      window.removeEventListener("click", initOnGesture);
    };
  }, []);

  const toggleAmbient = () => {
    audio.setAmbientEnabled(!ambientEnabled);
    audio.playClick();
  };

  const title = ambientEnabled ? "Ambient on" : "Ambient off";
  return (
    <button
      type="button"
      onClick={toggleAmbient}
      onMouseEnter={() => audio.playHover()}
      aria-label={title}
      title={title}
      className={chrome
        ? `flex h-full w-10 items-center justify-center transition-colors ${ambientEnabled ? "text-val-red" : "text-val-cream/45 hover:bg-white/8 hover:text-val-cream"}`
        : `flex size-9 items-center justify-center clip-angular-sm transition-[scale,background-color,color] border-0 outline-none p-0 cursor-pointer active:scale-95 ${ambientEnabled ? "bg-val-red/20 text-val-red" : "bg-white/6 text-white/35 hover:bg-white/10 hover:text-white/60"}`}
    >
      <Music size={16} />
    </button>
  );
}
