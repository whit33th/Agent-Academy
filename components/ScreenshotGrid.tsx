"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import { urlFor } from "@/lib/sanity";
import ScreenshotLightbox from "./ScreenshotLightbox";

import type { Screenshot } from "@/lib/types";

interface ScreenshotGridProps {
  screenshots: Screenshot[];
  agentName?: string;
  mapName?: string;
  agentImageUrl?: string;
}

export default function ScreenshotGrid({
  screenshots,
  agentName,
  mapName,
  agentImageUrl,
}: ScreenshotGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <LazyMotion features={domAnimation}>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          {agentImageUrl && (
            <div className="relative size-14 overflow-hidden clip-angular-sm bg-val-surface ring-1 ring-val-red/30">
              <Image
                src={agentImageUrl}
                alt={agentName || ""}
                width={100}
                height={100}
                className="object-cover object-top w-full h-full"
              />
            </div>
          )}
          <div>
            <h2 className="font-oswald text-2xl font-bold uppercase tracking-wider text-white md:text-3xl">
              {agentName}{" "}
              <span className="text-val-red">:</span>{" "}
              {mapName}
            </h2>
            <p className="text-xs font-medium uppercase tracking-wider text-white/30">
              {screenshots.length} lineup{screenshots.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {screenshots.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {screenshots.map((screenshot, i) => (
              <m.div
                key={screenshot._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
              >
                <button
                  onClick={() => setLightboxIndex(i)}
                  className="val-card group block w-full clip-angular bg-val-surface text-left"
                >
                  <div className="relative h-48 w-full bg-val-bg">
                    <Image
                      src={urlFor(screenshot.image).width(800).height(450).url()}
                      alt={screenshot.title}
                      fill
                      className="object-contain transition-all duration-200 group-hover:brightness-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate">
                      {screenshot.title}
                    </p>
                    {screenshot.abilityType && (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-val-red/70">
                        {screenshot.abilityType}
                      </p>
                    )}
                  </div>
                </button>
              </m.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center clip-diamond bg-white/[0.04]">
              <span className="text-2xl text-white/20">?</span>
            </div>
            <p className="text-sm font-medium text-white/40">
              No lineups yet for this combo.
            </p>
            <p className="mt-1 text-xs text-white/20">
              Add screenshots in Sanity Studio.
            </p>
          </div>
        )}

        <ScreenshotLightbox
          screenshots={screenshots}
          currentIndex={lightboxIndex ?? 0}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          onNext={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev + 1) % screenshots.length : 0,
            )
          }
          onPrev={() =>
            setLightboxIndex((prev) =>
              prev !== null
                ? (prev - 1 + screenshots.length) % screenshots.length
                : 0,
            )
          }
        />
      </div>
    </LazyMotion>
  );
}
