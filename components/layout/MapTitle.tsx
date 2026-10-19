import Image from "next/image";
import type { GameMap } from "@/lib/types";

interface MapTitleProps {
  map: GameMap;
}

export default function MapTitle({ map }: MapTitleProps) {
  if (!map.imageUrl) return null;
  return (
    <div className="flex items-center gap-4 min-w-0">
      <div className="relative size-14 shrink-0 overflow-hidden clip-angular-sm">
        <Image
          src={map.imageUrl}
          alt={map.name}
          fill
          sizes="112px"
          quality={90}
          className="object-cover object-center"
        />
      </div>
      <div className="flex h-full flex-col gap-1 justify-center min-w-0">
        <h2 className="font-oswald flex items-center gap-1 text-[1.75rem] font-semibold uppercase tracking-wider text-white sm:text-[2.2rem] md:text-[2.35rem] leading-[0.9] truncate">
          <span
            aria-hidden
            className="text-val-red inline-flex leading-none shrink-0"
          >
            {"//"}
          </span>
          <span className="truncate">{map.name}</span>
        </h2>
      </div>
    </div>
  );
}
