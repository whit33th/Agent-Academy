"use client";

import Image from "next/image";
import { m } from "framer-motion";
import { urlFor } from "@/lib/sanity";
import type { Screenshot } from "@/lib/types";
import { audio as sfx } from "@/lib/audio";
import { useLongPress } from "@/lib/utils/long-press";

interface ScreenshotCardProps {
  screenshot: Screenshot;
  index: number;
  onLongPress: (s: Screenshot) => void;
  onOpenLightbox: (index: number) => void;
}

export default function ScreenshotCard({
  screenshot,
  index,
  onLongPress,
  onOpenLightbox,
}: ScreenshotCardProps) {
  const press = useLongPress<Screenshot>(onLongPress)(screenshot);

  const src = screenshot.tempPreview
    ? screenshot.tempPreview
    : screenshot.image
      ? urlFor(screenshot.image).width(800).fit("max").url()
      : "";

  return (
    <m.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className="val-card group relative block w-full clip-angular bg-val-surface text-left"
    >
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
        <div className="relative aspect-video w-full bg-val-bg">
          {src && (
            <Image
              src={src}
              alt={screenshot.title}
              fill
              className="object-contain transition-filter duration-75 group-hover:brightness-110"
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
