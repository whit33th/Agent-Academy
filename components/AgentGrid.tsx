"use client";

import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Agent, GameMap } from "@/lib/types";

interface AgentGridProps {
  agents: Agent[];
  selectedMapSlug?: string;
  selectedMap?: GameMap | null;
}

/**
 * Custom framing config to achieve the exact Valorant agent select crop:
 * Aspect ratio is now wider (3/4.2) matching the reference.
 * Zoom is kept minimal (scale: 1.15 to 1.3) to guarantee 100% sharp, high-definition images.
 * Positives/offsets pull the head/chest perfectly into center view.
 */
const agentPortraitConfig: Record<
  string,
  {
    scale: number;
    x: number;
    y: number;
    objectPosition: string;
  }
> = {
  jett: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  phoenix: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  sage: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  sova: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  viper: {
    scale: 1.75,
    x: 4,
    y: 60,
    objectPosition: "center 2%",
  },
  cypher: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  brimstone: {
    scale: 1.2,
    x: 0,
    y: 18,
    objectPosition: "center 12%",
  },
  killjoy: {
    scale: 1.75,
    x: 9,
    y: 62,
    objectPosition: "center 2%",
  },
  breach: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  omen: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  raze: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  reyna: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  skye: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  yoru: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  astra: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  kayo: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  chamber: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  neon: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  fade: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  harbor: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  gekko: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  deadlock: {
    scale: 1.75,
    x: 20,
    y: 65,
    objectPosition: "center 2%",
  },
  iso: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  clove: {
    scale: 1.75,
    x: 23,
    y: 80,
    objectPosition: "center 2%",
  },
  vyse: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  tejo: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
};

const defaultConfig = {
  scale: 1.25,
  x: 0,
  y: 24,
  objectPosition: "center 8%",
};

export default function AgentGrid({
  agents,
  selectedMapSlug,
  selectedMap,
}: AgentGridProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        {selectedMap && (
          <div className="mb-4 flex items-center gap-4">
            {selectedMap.imageUrl && (
              <div className="relative size-14 overflow-visible">
                {/* Visible base cropped box */}
                <div className="absolute inset-x-0 bottom-0 top-2 overflow-hidden clip-angular-sm bg-val-surface ring-1 ring-white/10" />
                {/* Image wrapper allowing top overflow but side-clipping */}
                <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden pointer-events-none z-10">
                  <Image
                    src={selectedMap.imageUrl}
                    alt={selectedMap.name}
                    width={100}
                    height={100}
                    className="object-cover object-center w-full h-full scale-110 -translate-y-[8%]"
                  />
                </div>
              </div>
            )}
            <div className="flex h-full flex-col gap-1 justify-center">
              <h2 className="font-oswald flex items-center gap-1 text-3xl font-semibold uppercase tracking-wider text-white md:text-4xl leading-[0.9]">
                <span className="text-val-red inline-flex leading-none">
                  //
                </span>

                <span>{selectedMap.name}</span>
              </h2>

              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/35 leading-none">
                Select agent
              </p>
            </div>
          </div>
        )}

        {/* High-fidelity Valorant Agent Select Screen Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 ">
          {agents.map((agent, i) => {
            const viability = agent.viability;
            const slug = agent.slug?.current ?? agent._id;
            const gradientColors = agent.backgroundGradientColors || [];
            const agentName = (agent.name || "").toLowerCase();

            // Get individual config for tight zoom/framing
            const portraitCfg = agentPortraitConfig[agentName] || defaultConfig;

            // Generate card background gradient based on Valorant colors
            const hexColors = gradientColors.map(
              (c: string) => `#${c.slice(0, 6)}`,
            );
            const cardBg =
              hexColors.length >= 2
                ? `linear-gradient(180deg, ${hexColors[0]}99 0%, ${hexColors[1]}66 60%, #0a0a0a 100%)`
                : "linear-gradient(180deg, #1b2733 0%, #0f1923 100%)";

            const primaryColor = hexColors[0] || "#0faf4b";

            const params = new URLSearchParams();
            if (selectedMapSlug) params.set("map", selectedMapSlug);
            params.set("agent", slug);

            return (
              <m.div
                key={agent._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
              >
                <Link
                  href={`/?${params.toString()}`}
                  className="group relative block w-full h-[340px] overflow-visible transition-all duration-200 hover:-translate-y-1.5"
                >
                  {/* Card Background & Clip Container */}
                  <div
                    className="absolute inset-x-0 bottom-0 top-5 overflow-hidden clip-angular border border-white/5 transition-all duration-200 group-hover:border-[var(--agent-accent)]/80 group-hover:shadow-[0_12px_30px_var(--agent-accent-shadow)]"
                    style={
                      {
                        background: cardBg,
                        "--agent-accent": primaryColor,
                        "--agent-accent-shadow": `${primaryColor}26`,
                      } as React.CSSProperties
                    }
                  >
                    {/* Character background element */}
                    {agent.background && (
                      <Image
                        src={agent.background}
                        alt=""
                        fill
                        className="object-cover object-center scale-120 mix-blend-color-burn opacity-10 "
                      />
                    )}
                  </div>

                  {/* Agent portrait with top popout and side clipping */}
                  {agent.imageUrl && (
                    <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden pointer-events-none z-10">
                      {/* Parent handles absolute pixel translations */}
                      <div
                        className="absolute inset-0"
                        style={{
                          transform: `translate3d(${portraitCfg.x}px, ${portraitCfg.y}px, 0)`,
                        }}
                      >
                        {/* Child handles custom agent scale and hover zoom via CSS variable multiplier */}
                        <div
                          className="absolute inset-0 transition-transform duration-200 ease-out [--zoom-multiplier:1] group-hover:[--zoom-multiplier:1.05]"
                          style={{
                            transform: `scale(calc(${portraitCfg.scale} * var(--zoom-multiplier, 1)))`,
                          }}
                        >
                          <Image
                            src={agent.imageUrl}
                            alt={agent.name}
                            fill
                            sizes="200vw"
                            className="object-cover drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
                            style={{
                              objectPosition: portraitCfg.objectPosition,
                            }}
                            priority={i < 6}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom overlay for name contrast */}
                  <div className="absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                  {/* Agent Name & Details at the bottom */}
                  <div className="absolute inset-x-0 bottom-0 z-30 p-3 pointer-events-none">
                    <p className="font-oswald text-lg font-bold uppercase tracking-wider text-white text-center group-hover:text-[var(--agent-accent)] transition-colors">
                      {agent.name}
                    </p>
                    {agent.roleName && (
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">
                        {agent.roleIcon && (
                          <div className="relative size-2.5 opacity-60 group-hover:opacity-100 group-hover:scale-109 transition-[scale,opacity] duration-200">
                            <Image src={agent.roleIcon} alt="" fill />
                          </div>
                        )}
                        <span>{agent.roleName}</span>
                      </div>
                    )}
                  </div>

                  {/* Left color bar representing role accent */}
                  <div
                    className="absolute left-0 top-5 bottom-0 w-px z-40"
                    style={{ backgroundColor: primaryColor }}
                  />
                  {/* bottom color bar representing role accent */}
                  <div
                    className="absolute left-0 bottom-0 right-0 w-full h-px z-40"
                    style={{ backgroundColor: primaryColor }}
                  />
                  {/* Viability tag */}
                  {viability && (
                    <div
                      className="absolute right-3 top-8 z-40 flex size-7 items-center justify-center font-oswald text-xs font-bold text-white shadow-lg clip-diamond"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {viability}
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
