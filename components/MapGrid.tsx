"use client";

import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { GameMap } from "@/lib/types";

interface MapGridProps {
  maps: GameMap[];
  agentCount: number;
}

export default function MapGrid({ maps, agentCount }: MapGridProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* Map grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {maps.map((map, i: number) => {
            const slug = map.slug?.current ?? map._id;

            return (
              <m.div
                key={map._id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
              >
                <Link
                  href={`/?map=${slug}`}
                  className="val-card group block clip-angular bg-val-surface text-left"
                >
                  {map.imageUrl && (
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: "16/9" }}
                    >
                      <Image
                        src={map.imageUrl}
                        alt={map.name}
                        fill
                        className="object-cover transition-all duration-200 group-hover:scale-110 group-hover:brightness-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      {/* Red accent line at bottom */}
                      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-all duration-200 group-hover:w-full" />

                      {/* Map name overlay */}
                      <div className="absolute inset-x-0 bottom-0 z-10 p-3">
                        <p className="font-oswald text-lg font-bold uppercase tracking-wide text-white">
                          {map.name}
                        </p>
                      </div>
                    </div>
                  )}
                </Link>
              </m.div>
            );
          })}
        </div>
      </m.div>
    </LazyMotion>
  );
}
