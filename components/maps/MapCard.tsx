"use client";

import Image from "next/image";
import Link from "next/link";
import type { GameMap } from "@/lib/types";
import { audio } from "@/lib/audio";
import { useLongPress } from "@/lib/utils/long-press";

interface MapCardProps {
  map: GameMap;
  onLongPress: (map: GameMap) => void;
  priority?: boolean;
}

export default function MapCard({ map, onLongPress, priority }: MapCardProps) {
  const slug = map.slug?.current ?? map._id;
  const press = useLongPress<GameMap>(onLongPress)(map);

  if (!map.imageUrl) return null;

  return (
    <Link
      href={`/${slug}`}
      onPointerDown={press.onPointerDown}
      onPointerMove={press.onPointerMove}
      onPointerUp={press.onPointerUp}
      onPointerCancel={press.onPointerCancel}
      onPointerLeave={press.onPointerLeave}
      onClick={(e) => {
        if (press.handleClick(e)) return;
        audio.playClick();
      }}
      onMouseEnter={() => audio.playHover()}
      onContextMenu={(e) => e.preventDefault()}
      className="val-card group block clip-angular bg-val-surface text-left select-none touch-pan-y touch-callout-none"
    >
      <figure className="relative w-full overflow-hidden aspect-video">
        <Image
          src={map.imageUrl}
          alt={map.name}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="object-cover transition-[scale,filter] duration-200 group-hover:scale-110 group-hover:brightness-110 pointer-events-none"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 50vw"
          quality={95}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-[width] duration-200 group-hover:w-full pointer-events-none" />
        <figcaption className="absolute inset-x-0 bottom-0 z-10 p-3 pointer-events-none">
          <p className="font-oswald text-lg font-bold uppercase tracking-wide text-white">
            {map.name}
          </p>
        </figcaption>
      </figure>
    </Link>
  );
}
