"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import { urlFor } from "@/lib/sanity";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import ScreenshotLightbox from "./ScreenshotLightbox";
import { LayoutGrid } from "lucide-react";

interface LineupViewerProps {
  screenshots: Screenshot[];
  agent: Agent;
  map: GameMap;
}

// Helper to match screenshots to specific abilities by mapping slots, types, and keywords
function matchScreenshotToAbility(screenshot: Screenshot, ability: any, agentName: string): boolean {
  const title = (screenshot.title || "").toLowerCase();
  const abilityType = (screenshot.abilityType || "").toLowerCase();
  const abilityName = (ability.displayName || "").toLowerCase();
  const slot = (ability.slot || "").toLowerCase();

  // Ultimate slot check
  if (slot === "ultimate" || abilityName.includes("ultimate")) {
    return (
      abilityType === "ultimate" ||
      title.includes("ult") ||
      title.includes("ultimate") ||
      title.includes(abilityName)
    );
  }

  const agent = agentName.toLowerCase();

  if (agent === "killjoy") {
    if (abilityName.includes("nanoswarm") || slot === "grenade") {
      return (
        abilityType === "molly" ||
        title.includes("molly") ||
        title.includes("nanoswarm") ||
        title.includes("granade") ||
        title.includes("grenade") ||
        title.includes("swarm")
      );
    }
    if (abilityName.includes("turret") || slot === "ability2") {
      return title.includes("turret") || title.includes("turet");
    }
    if (abilityName.includes("alarmbot") || slot === "ability1") {
      return title.includes("alarm") || title.includes("bot");
    }
  }

  if (agent === "viper") {
    if (abilityName.includes("toxic screen") || slot === "ability2") {
      return (
        abilityType === "wall" ||
        title.includes("wall") ||
        title.includes("screen") ||
        title.includes("toxic screen")
      );
    }
    if (abilityName.includes("poison cloud") || slot === "ability1") {
      return (
        title.includes("cloud") ||
        title.includes("orb") ||
        title.includes("smoke") ||
        title.includes("poison") ||
        title.includes("cloud")
      );
    }
    if (abilityName.includes("snake bite") || slot === "grenade") {
      return title.includes("bite") || title.includes("snake") || title.includes("molly");
    }
  }

  // Generic keyword matching
  const keywords = abilityName.split(" ");
  for (const keyword of keywords) {
    if (keyword.length > 3 && title.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export default function LineupViewer({
  screenshots,
  agent,
  map,
}: LineupViewerProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedAbilityIdx, setSelectedAbilityIdx] = useState<number>(-1); // -1 means "All"
  const [selectedSide, setSelectedSide] = useState<"all" | "atk" | "def">("all");

  const roleName = agent?.roleName ?? "";
  const roleIcon = agent?.roleIcon;
  const description = agent?.description || "";
  const abilities = agent?.abilities || [];
  const gradientColors = agent?.backgroundGradientColors || [];
  const accentColor = gradientColors[0]
    ? `#${gradientColors[0].slice(0, 6)}`
    : "#ff4655";

  const selectedAbility = selectedAbilityIdx !== -1 ? abilities[selectedAbilityIdx] : null;

  // Filter screenshots based on selected Side (ATK/DEF) and Ability Type
  const filteredScreenshots = screenshots.filter((screenshot) => {
    // 1. Filter by Side
    if (selectedSide !== "all") {
      const title = (screenshot.title || "").toLowerCase();
      const isAtk = title.includes("atk") || title.includes("attack");
      const isDef = title.includes("def") || title.includes("defense") || title.includes("retake");
      if (selectedSide === "atk" && !isAtk) return false;
      if (selectedSide === "def" && !isDef) return false;
    }

    // 2. Filter by Ability
    if (selectedAbilityIdx !== -1) {
      const ability = abilities[selectedAbilityIdx];
      if (!ability) return true;
      return matchScreenshotToAbility(screenshot, ability, agent?.name || "");
    }

    return true;
  });

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col">
        {/* Main content */}
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          {/* Left — Screenshots grid & side filters */}
          <div className="flex-1 min-w-0">
            {/* Side Tabs Selector */}
            <div className="mb-5 flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mr-2">Side:</span>
                {(["all", "atk", "def"] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setSelectedSide(side)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all border ${
                      selectedSide === side
                        ? "border-val-red/30 bg-val-red/10 text-val-red"
                        : "border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {side === "all" ? "All" : side === "atk" ? "Attack (ATK)" : "Defense (DEF)"}
                  </button>
                ))}
              </div>
              <div className="text-xs text-white/30 font-medium">
                Showing {filteredScreenshots.length} of {screenshots.length} setups
              </div>
            </div>

            {filteredScreenshots.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredScreenshots.map((screenshot, i) => (
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
                  No matching setups found.
                </p>
                <p className="mt-1 text-xs text-white/20">
                  Try changing your filters or adding screenshots.
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
              <div className="mt-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Abilities Filter:
                </p>
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {/* All Abilities Button */}
                  <button
                    onClick={() => setSelectedAbilityIdx(-1)}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-all ${
                      selectedAbilityIdx === -1
                        ? "border-val-red bg-val-red/10 text-val-red"
                        : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:opacity-100"
                    }`}
                    title="Show all abilities"
                  >
                    <LayoutGrid size={16} />
                    {selectedAbilityIdx === -1 && (
                      <div
                        className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </button>

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
                          title={ability.displayName}
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
                {selectedAbility ? (
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
                ) : (
                  <div>
                    <p
                      className="mb-1 text-xs font-bold uppercase tracking-wider text-white/60"
                    >
                      All Setups
                    </p>
                    <p className="text-xs leading-relaxed text-white/40">
                      Showing setups for all abilities. Select an icon above to filter.
                    </p>
                  </div>
                )}
              </div>
            </m.div>
          </div>
        </div>

        <ScreenshotLightbox
          screenshots={filteredScreenshots}
          currentIndex={lightboxIndex ?? 0}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          onNext={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev + 1) % filteredScreenshots.length : 0,
            )
          }
          onPrev={() =>
            setLightboxIndex((prev) =>
              prev !== null
                ? (prev - 1 + filteredScreenshots.length) % filteredScreenshots.length
                : 0,
            )
          }
        />
      </div>
    </LazyMotion>
  );
}
