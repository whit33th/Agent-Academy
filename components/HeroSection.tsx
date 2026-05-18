import { Crosshair, MapPin, MousePointer2 } from "lucide-react";

interface HeroSectionProps {
  agentCount: number;
  mapCount: number;
}

export default function HeroSection({
  agentCount,
  mapCount,
}: HeroSectionProps) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-20 md:py-28">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,70,85,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(23,232,180,0.06),transparent_45%)]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Diagonal lines */}
        <div className="absolute top-0 right-0 h-full w-1/3 opacity-[0.015]"
          style={{
            backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(255,70,85,0.5) 20px, rgba(255,70,85,0.5) 21px)",
          }}
        />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 mx-auto max-w-5xl text-center">
        {/* Tagline */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-sm bg-white/[0.04] px-4 py-1.5 ring-1 ring-white/[0.08]">
          <div className="h-1.5 w-1.5 rounded-full bg-val-red animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
            Tactical Reference
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-oswald text-[clamp(3rem,9vw,7rem)] font-bold uppercase leading-[0.88] tracking-tight text-white">
          <span className="text-val-red">Lineup</span>
          <br />
          <span className="text-val-cream/90">Arsenal</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/35 sm:text-base md:mt-6">
          Your tactical advantage starts here. Select a map or agent to explore
          every lineup you need to dominate the round.
        </p>

        {/* Stats bar */}
        <div className="mx-auto mt-8 flex items-center justify-center gap-6 text-center md:mt-10">
          <div>
            <p className="font-oswald text-3xl font-bold text-val-red">{agentCount}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Agents</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <p className="font-oswald text-3xl font-bold text-val-teal">{mapCount}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Maps</p>
          </div>
        </div>

        {/* CTA hints */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-10">
          <div className="group flex items-center gap-2.5 clip-angular-sm bg-white/[0.04] px-5 py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-val-red/10 hover:ring-val-red/30 cursor-default">
            <MapPin size={15} className="text-val-red" />
            <span className="text-[13px] font-medium text-white/60 group-hover:text-white/80">
              Pick a Map
            </span>
          </div>
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.3em] text-white/15 sm:inline">
            or
          </span>
          <div className="group flex items-center gap-2.5 clip-angular-sm bg-white/[0.04] px-5 py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-role-sentinel/10 hover:ring-role-sentinel/30 cursor-default">
            <Crosshair size={15} className="text-role-sentinel" />
            <span className="text-[13px] font-medium text-white/60 group-hover:text-white/80">
              Pick an Agent
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-12 md:mt-16">
          <div className="flex flex-col items-center gap-2 text-white/20">
            <MousePointer2 size={14} className="animate-bounce" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.3em]">
              Choose below
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
