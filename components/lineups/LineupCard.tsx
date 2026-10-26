"use client";

import { m } from "framer-motion";
import { Star } from "lucide-react";
import type { Screenshot } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import { useLongPress } from "@/lib/utils/long-press";
import LineupImage from "./LineupImage";
import LineupVideoCover from "./LineupVideoCover";
import LineupMetadataBadges from "./LineupMetadataBadges";

interface LineupCardProps {
  screenshot: Screenshot;
  index: number;
  onLongPress: (s: Screenshot) => void;
  onOpenLightbox: (index: number) => void;
  accentColor?: string;
  abilityFilterActive?: boolean;

  isFavorite?: boolean;
  priority?: boolean;
}

export default function LineupCard({
  screenshot,
  index,
  onLongPress,
  onOpenLightbox,
  accentColor = "#FF4655",
  abilityFilterActive = false,

  isFavorite = false,
  priority = false,
}: LineupCardProps) {
  const press = useLongPress<Screenshot>(onLongPress)(screenshot);

  const src = screenshot.tempPreview
    ? screenshot.tempPreview
    : (screenshot.image ?? "");

  return (
    <m.article
      layout
      initial={false}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.28,
        layout: { duration: 0.25 },
      }}
      className="val-card group relative block w-full clip-angular bg-val-surface text-left"
      style={
        abilityFilterActive
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
            abilityFilterActive
              ? { boxShadow: `inset 0 0 0 2px ${accentColor}40` }
              : undefined
          }
        >
          <LineupMetadataBadges metadata={screenshot.metadata} />
          {(screenshot.images?.length ?? 0) > 1 ? (
            <span className="absolute bottom-2 right-2 z-10 bg-black/80 px-2 py-1 text-xs text-white/80">
              {screenshot.images!.length} images
            </span>
          ) : null}
          {!src && screenshot.videoUrl ? (
            <LineupVideoCover
              map={screenshot.map?.name ?? ""}
              videoUrl={screenshot.videoUrl}
              priority={priority}
            />
          ) : null}
          {src && (
            <LineupImage
              src={src}
              alt={screenshot.title}
              fill
              priority={priority}
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
