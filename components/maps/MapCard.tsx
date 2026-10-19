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
      className="map-select-card group relative block text-left select-none touch-pan-y touch-callout-none"
    >
      <figure className="absolute inset-[var(--stroke)] overflow-hidden">
        <Image
          src={map.imageUrl}
          alt={map.name}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="object-cover pointer-events-none"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 50vw"
          quality={95}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />
        <div className="map-select-wash pointer-events-none" />
        <figcaption className="map-select-name pointer-events-none">
          <p>{map.name}</p>
        </figcaption>
      </figure>
      <div className="map-select-frame" aria-hidden />
      <div className="map-select-bottom" aria-hidden>
        <i className="l" />
        <i className="m" />
        <i className="r" />
      </div>
    </Link>
  );
}
