"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2 } from "lucide-react";
import { audio as sfx } from "@/lib/audio";

interface VoiceLineButtonProps {
  voiceUrl: string | null;
  agentId: string;
  accentColor: string;
}

export default function VoiceLineButton({
  voiceUrl,
  agentId: _agentId,
  accentColor,
}: VoiceLineButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    a.volume = sfx.getVoiceVolume() ?? 0.1;
    audioRef.current = a;

    const onEnded = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onError = () => setIsPlaying(false);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    a.addEventListener("error", onError);

    return () => {
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("error", onError);
      a.pause();
      a.removeAttribute("src");
      a.load();
    };
  }, []);

  const handleClick = useCallback(() => {
    const a = audioRef.current;
    if (!a || !voiceUrl) return;
    sfx.playClick();
    if (isPlaying) {
      a.pause();
      return;
    }
    if (a.src !== voiceUrl) {
      a.src = voiceUrl;
      a.load();
    }
    a.currentTime = 0;
    a.volume = sfx.getVoiceVolume() ?? 0.1;
    a.play().catch(() => {});
  }, [voiceUrl, isPlaying]);

  if (!voiceUrl) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isPlaying ? "Stop voice line" : "Play voice line"}
      aria-pressed={isPlaying}
      className="group/voice mb-4 flex items-center gap-2.5 px-3 py-2 rounded-sm border transition-[border-color,background-color,color] duration-200 cursor-pointer select-none"
      style={{
        borderColor: isPlaying ? `${accentColor}60` : "rgba(255,255,255,0.1)",
        backgroundColor: isPlaying
          ? `${accentColor}12`
          : "rgba(255,255,255,0.03)",
      }}
    >
      {isPlaying ? (
        <span className="voice-waveform">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="voice-waveform-bar is-playing"
              style={{ backgroundColor: accentColor }}
            />
          ))}
        </span>
      ) : (
        <Volume2
          size={16}
          className="text-white/40 group-hover/voice:text-white/70 transition-colors"
        />
      )}
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
        style={{ color: isPlaying ? accentColor : "rgba(255,255,255,0.4)" }}
      >
        {isPlaying ? "Playing..." : "Voice Line"}
      </span>
    </button>
  );
}
