import Image from "next/image";
import type { GameMap } from "@/lib/types";

interface MapTitleProps {
  map: GameMap;
}

export default function MapTitle({ map }: MapTitleProps) {
  if (!map.imageUrl) return null;
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-14 overflow-visible">
       
        <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden pointer-events-none z-10">
          <Image
            src={map.imageUrl}
            alt={map.name}
            width={100}
            height={100}
            priority
            loading="eager"
            fetchPriority="high"
            className="object-cover object-center w-full h-full scale-110 -translate-y-[8%]"
          />
        </div>
      </div>
      <div className="flex h-full flex-col gap-1 justify-center">
        <h2 className="font-oswald flex items-center gap-1 text-[2.2rem] font-semibold uppercase tracking-wider text-white md:text-[2.35rem] leading-[0.9]">
          <span aria-hidden className="text-val-red inline-flex leading-none">
            //
          </span>
          <span>{map.name}</span>
        </h2>
      </div>
    </div>
  );
}
