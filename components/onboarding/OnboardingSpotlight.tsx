"use client";

import { useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useBodyScrollLock } from "@/lib/utils/body-scroll-lock";
import { audio as sfx } from "@/lib/audio";
import type { SpotlightRect } from "./useSpotlightRect";

export interface OnboardingSpotlightProps {
  open: boolean;
  rect: SpotlightRect | null;
  title: string;
  body: React.ReactNode;
  stepLabel: string;
  totalDots: number;
  activeDot: number;
  onNext: () => void;
  onBack?: () => void;
  onSkip: () => void;
  nextLabel?: string;
  showBack?: boolean;
}

export default function OnboardingSpotlight({
  open,
  rect,
  title,
  body,
  stepLabel,
  totalDots,
  activeDot,
  onNext,
  onBack,
  onSkip,
  nextLabel = "Next",
  showBack = false,
}: OnboardingSpotlightProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onSkip]);

  const tooltipStyle: React.CSSProperties = rect
    ? {
        top: Math.min(rect.top + rect.height + 16, window.innerHeight - 240),
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 360)),
      }
    : {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] pointer-events-none"
          role="dialog"
          aria-modal="false"
          aria-label={title}
        >
          {rect ? (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute rounded-sm pointer-events-none"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                boxShadow: "0 0 0 9999px rgba(10, 10, 10, 0.88)",
              }}
            />
          ) : (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-val-bg/75 pointer-events-none"
            />
          )}

          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute z-[201] w-[min(100vw-2rem,22rem)] clip-angular border border-white/10 bg-val-surface p-5 shadow-2xl pointer-events-auto"
            style={tooltipStyle}
          >
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-val-red">
              {stepLabel}
            </p>
            <h2 className="font-oswald text-lg font-bold uppercase text-white mb-2">
              {title}
            </h2>
            <div className="text-sm leading-relaxed text-white/55 mb-4">{body}</div>

            <div className="mb-4 flex gap-1.5">
              {Array.from({ length: totalDots }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i === activeDot ? "bg-val-red" : "bg-white/15"
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showBack && onBack && (
                <button
                  type="button"
                  onClick={() => {
                    sfx.playClick();
                    onBack();
                  }}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  onSkip();
                }}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/35 hover:text-white/60 transition-colors cursor-pointer"
              >
                Skip tour
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  onNext();
                }}
                className="ml-auto clip-angular-sm bg-val-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-val-red/90 transition-colors cursor-pointer"
              >
                {nextLabel}
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
