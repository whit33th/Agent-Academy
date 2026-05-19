"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import { urlFor } from "@/lib/sanity";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import ScreenshotLightbox from "./ScreenshotLightbox";

interface LineupViewerProps {
  screenshots: Screenshot[];
  agent: Agent;
  map: GameMap;
}

export default function LineupViewer({
  screenshots,
  agent,
  map,
}: LineupViewerProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedAbilityIdx, setSelectedAbilityIdx] = useState(0);

  const roleName = agent?.roleName ?? "";
  const roleIcon = agent?.roleIcon;
  const description = agent?.description || "";
  const abilities = agent?.abilities || [];
  const gradientColors = agent?.backgroundGradientColors || [];
  const accentColor = gradientColors[0]
    ? `#${gradientColors[0].slice(0, 6)}`
    : "#ff4655";

  const selectedAbility = abilities[selectedAbilityIdx];
  const mapSlug = map?.slug?.current || map?._id || "";

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col">
        {/* Main content */}
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          {/* Left — Screenshots grid */}
          <div className="flex-1 min-w-0">
            {screenshots.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
                      <div className="relative aspect-video w-full bg-val-bg">
                        <Image
                          src={urlFor(screenshot.image)
                            .width(800)
                            .height(450)
                            .url()}
                          alt={screenshot.title}
                          fill
                          className="object-contain transition-filter duration-75 group-hover:brightness-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-white truncate">
                          {screenshot.title}
                        </p>
                        {/* {screenshot.abilityType && (
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-val-red/70">
                            {screenshot.abilityType}
                          </p>
                        )} */}
                      </div>
                    </button>
                  </m.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex size-16 items-center justify-center clip-diamond bg-white/4">
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
          </div>

          {/* Right — Agent info panel */}
          <div className="w-full shrink-0 lg:w-80">
            <m.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Role */}
              <div className="mb-2 flex items-center gap-2">
                {roleIcon && (
                  <Image
                    src={roleIcon}
                    alt={roleName}
                    width={14}
                    height={14}
                    className="opacity-70"
                  />
                )}
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                  {roleName}
                </p>
              </div>

              {/* Name */}
              <h1
                className="mb-3 font-oswald text-5xl brightness-155 font-bold uppercase leading-none"
                style={{
                  color: accentColor,
                  textShadow: `0 0 40px ${accentColor}30`,
                }}
              >
                {agent?.name}
              </h1>

              {/* Description */}
              <p
                className="mb-5 text-sm leading-relaxed brightness-190"
                style={{ color: `${accentColor}B1` }}
              >
                {description}
              </p>

              {/* Portrait */}
              {agent.displayIcon && (
                <div className="relative my-4 aspect-square w-42 overflow-hidden">
                  <Image
                    src={agent.displayIcon}
                    alt={agent?.name}
                    fill
                    className="object-cover object-center"
                    style={{
                      filter: `drop-shadow(0 20px 40px ${accentColor}40)`,
                    }}
                    priority
                  />
                </div>
              )}

              {/* Abilities */}
              {abilities.length > 0 && (
                <div className="mt-2">
                  <div className="mb-3 flex items-center gap-2">
                    {abilities.map(
                      (ability, idx) =>
                        ability.displayIcon && (
                          <button
                            key={ability.slot || idx}
                            onClick={() => setSelectedAbilityIdx(idx)}
                            className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-all ${
                              idx === selectedAbilityIdx
                                ? "border-white/40 bg-white/10"
                                : "border-white/10 bg-white/5 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <Image
                              src={ability.displayIcon}
                              alt={ability.displayName}
                              width={22}
                              height={22}
                              className="object-contain"
                            />
                            {idx === selectedAbilityIdx && (
                              <div
                                className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                                style={{ backgroundColor: accentColor }}
                              />
                            )}
                          </button>
                        ),
                    )}
                  </div>
                  {selectedAbility && (
                    <div>
                      <p
                        className="mb-1 text-xs font-bold uppercase tracking-wider"
                        style={{ color: accentColor }}
                      >
                        {selectedAbility.displayName}
                      </p>
                      <p className="text-xs leading-relaxed text-white/40">
                        {selectedAbility.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </m.div>
          </div>
        </div>

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
