"use client";

import { useState, useEffect } from "react";
import { Music } from "lucide-react";
import { audio } from "@/lib/audio";

export default function AudioSettingsHUD() {
  const [ambientEnabled, setAmbientEnabled] = useState(false);

  useEffect(() => {
    setAmbientEnabled(audio.isAmbientEnabled());

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
    const next = !ambientEnabled;
    setAmbientEnabled(next);
    audio.setAmbientEnabled(next);
    audio.playClick();
  };

  return (
    <button
      onClick={toggleAmbient}
      onMouseEnter={() => audio.playHover()}
      className={`flex size-9 items-center justify-center clip-angular-sm transition-[scale,background-color,color] border-0 outline-none p-0 cursor-pointer active:scale-95 ${
        ambientEnabled
          ? "bg-val-red/20 text-val-red"
          : "bg-white/6 text-white/35 hover:bg-white/10 hover:text-white/60"
      }`}
      title={ambientEnabled ? "Ambient On" : "Ambient Off"}
    >
      <Music size={16} />
    </button>
  );
}
