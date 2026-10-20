"use client";

import Link from "next/link";
import type { GameMap } from "@/lib/types";
import { audio } from "@/lib/audio";
import { useLongPress } from "@/lib/utils/long-press";
import MapCardVisual from "./MapCardVisual";

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
      prefetch={true}
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
      <MapCardVisual map={map} priority={priority} />
    </Link>
  );
}
