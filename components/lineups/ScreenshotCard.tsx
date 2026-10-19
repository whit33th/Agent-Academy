"use client";

import Image from "next/image";
import { m } from "framer-motion";
import { Star } from "lucide-react";
import type { Screenshot } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import { useLongPress } from "@/lib/utils/long-press";

interface ScreenshotCardProps {
  screenshot: Screenshot;
  index: number;
  onLongPress: (s: Screenshot) => void;
  onOpenLightbox: (index: number) => void;
  accentColor?: string;
  abilityFilterActive?: boolean;
  abilityMatch?: boolean;
  isFavorite?: boolean;
}

export default function ScreenshotCard({
  screenshot,
  index,
  onLongPress,
  onOpenLightbox,
  accentColor = "#FF4655",
  abilityFilterActive = false,
  abilityMatch = true,
  isFavorite = false,
}: ScreenshotCardProps) {
  const press = useLongPress<Screenshot>(onLongPress)(screenshot);
  const dimmed = abilityFilterActive && !abilityMatch;

  const src = screenshot.tempPreview
    ? screenshot.tempPreview
    : screenshot.image ?? "";

  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: dimmed ? 0.38 : 1,
        y: 0,
        scale: abilityFilterActive && abilityMatch ? 1 : dimmed ? 0.98 : 1,
      }}
      transition={{
        delay: index * 0.02,
        duration: 0.28,
        layout: { duration: 0.25 },
      }}
      className="val-card group relative block w-full clip-angular bg-val-surface text-left"
      style={
        abilityFilterActive && abilityMatch
          ? {
              boxShadow: `0 0 0 1px ${accentColor}55, 0 8px 28px ${accentColor}18`,
            }
          : undefined
      }
    >
      {isFavorite && (
        <span
          className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center clip-angular-sm bg-val-bg/80 text-val-gold pointer-events-none"
          aria-hidden
        >
          <Star size={14} fill="currentColor" />
        </span>
      )}
      <button
        type="button"
        onPointerDown={press.onPointerDown}
        onPointerMove={press.onPointerMove}
        onPointerUp={press.onPointerUp}
        onPointerCancel={press.onPointerCancel}
        onPointerLeave={press.onPointerLeave}
        onClick={(e) => {
          if (press.handleClick(e)) return;
          sfx.playClick();
          sfx.playModalOpen();
          onOpenLightbox(index);
        }}
        onMouseEnter={() => sfx.playHover()}
        className="block w-full text-left cursor-pointer select-none touch-pan-y touch-callout-none"
      >
        <div
          className="relative aspect-video w-full bg-val-bg transition-[box-shadow] duration-200"
          style={
            abilityFilterActive && abilityMatch
              ? { boxShadow: `inset 0 0 0 2px ${accentColor}40` }
              : undefined
          }
        >
          {src && (
            <Image
              src={src}
              alt={screenshot.title}
              fill
              className="object-contain transition-[filter,opacity] duration-200 group-hover:brightness-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}
        </div>
        <p className="p-3 text-sm font-medium text-white truncate pr-2">
          {screenshot.title}
        </p>
      </button>
    </m.article>
  );
}
