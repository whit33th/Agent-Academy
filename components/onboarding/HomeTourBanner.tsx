"use client";

import { m } from "framer-motion";
import { MapPin } from "lucide-react";
import { skipOnboarding } from "@/lib/onboarding/state";
import { audio as sfx } from "@/lib/audio";

interface HomeTourBannerProps {
  step: 2 | 3;
}

export default function HomeTourBanner({ step }: HomeTourBannerProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-4 right-4 z-[150] mx-auto max-w-lg pointer-events-auto"
      role="status"
    >
      <div className="clip-angular border border-val-red/30 bg-val-surface/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center clip-angular-sm bg-val-red/15 text-val-red">
            <MapPin size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-val-red mb-1">
              Tour · Step {step} of 3
            </p>
            <p className="text-sm font-medium text-white">
              Pick a map below, then choose an agent — the tour continues on the
              lineup page.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            sfx.playClick();
            skipOnboarding();
          }}
          className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/35 hover:text-white/55 transition-colors cursor-pointer"
        >
          Skip tour
        </button>
      </div>
    </m.div>
  );
}
