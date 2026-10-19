"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Agent } from "@/lib/types";
import { audio } from "@/lib/audio";
import { useLongPress } from "@/lib/utils/long-press";
import { accentFromGradient, agentCardBackground } from "@/lib/utils/color";
import { getPortraitConfig } from "./portrait-config";

interface AgentCardProps {
  agent: Agent;
  mapSlug: string;
  onLongPress: (agent: Agent) => void;
  priority?: boolean;
}

export default function AgentCard({
  agent,
  mapSlug,
  onLongPress,
  priority,
}: AgentCardProps) {
  const press = useLongPress<Agent>(onLongPress)(agent);
  const slug = agent.slug?.current ?? agent._id;
  const cfg = getPortraitConfig(agent.name);
  const accent = accentFromGradient(agent.backgroundGradientColors);
  const cardBg = agentCardBackground(agent.backgroundGradientColors);

  return (
    <Link
      href={`/${mapSlug}/${slug}`}
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
      className="group relative block w-full h-[340px] overflow-visible select-none touch-pan-y touch-callout-none"
    >
      <div
        className="absolute inset-x-0 bottom-0 top-5 overflow-hidden clip-angular border border-white/5 shadow-[inset_1px_0_0_var(--agent-accent),inset_0_-1px_0_var(--agent-accent)] transition-[filter,border-color,box-shadow] duration-200 group-hover:brightness-[1.06] group-hover:border-[var(--agent-accent)] group-hover:shadow-[inset_1px_0_0_var(--agent-accent),inset_0_-1px_0_var(--agent-accent),0_12px_30px_var(--agent-accent-glow)]"
        style={
          {
            background: cardBg,
            "--agent-accent": accent,
            "--agent-accent-glow": `${accent}99`,
          } as CSSProperties
        }
      >
        {agent.background && (
          <Image
            src={agent.background}
            alt=""
            fill
            sizes="480px"
            quality={75}
            loading="lazy"
            fetchPriority="low"
            className="object-cover object-center scale-120 mix-blend-color-burn opacity-10"
          />
        )}
      </div>

      {agent.imageUrl && (
        <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden pointer-events-none z-10">
          <div
            className="absolute inset-0"
            style={{ transform: `translate3d(${cfg.x}px, ${cfg.y}px, 0)` }}
          >
            <div
              className="absolute inset-0 origin-center transition-transform duration-[85ms] ease-out [--zoom-multiplier:1] group-hover:[--zoom-multiplier:1.05]"
              style={{
                transform: `scale(calc(${cfg.scale} * var(--zoom-multiplier, 1)))`,
              }}
            >
              <Image
                src={agent.imageUrl}
                alt={agent.name}
                fill
                sizes="(max-width: 768px) 100vw, 840px"
                quality={95}
                className="object-cover drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
                style={{ objectPosition: cfg.objectPosition }}
                priority={priority}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
              />
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 z-30 p-3 pointer-events-none">
        <p className="font-oswald text-lg font-bold uppercase tracking-wider text-white text-center group-hover:text-[var(--agent-accent)] transition-colors">
          {agent.name}
        </p>
        {agent.roleName && (
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">
            {agent.roleIcon && (
              <div className="relative size-2.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                <Image src={agent.roleIcon} alt="" fill sizes="32px" quality={90} />
              </div>
            )}
            <span>{agent.roleName}</span>
          </div>
        )}
      </div>

      {agent.viability && (
        <div className="absolute right-1/2 translate-x-1/2 bottom-16 z-40 flex size-10 items-center justify-center select-none filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.83)]">
          <Image
            src={`/ranks/${agent.viability.toLowerCase()}.png`}
            alt={`${agent.viability} Rank`}
            fill
            sizes="80px"
            quality={90}
            className="object-contain"
          />
        </div>
      )}
    </Link>
  );
}
