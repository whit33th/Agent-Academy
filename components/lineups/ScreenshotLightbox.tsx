"use client";

import { useEffect, useCallback } from "react";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { urlFor } from "@/lib/sanity";
import { useBodyScrollLock } from "@/lib/utils/body-scroll-lock";
import type { Screenshot } from "@/lib/types";

interface ScreenshotLightboxProps {
  screenshots: Screenshot[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function ScreenshotLightbox({
  screenshots,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrev,
}: ScreenshotLightboxProps) {
  const current = screenshots[currentIndex];
  useBodyScrollLock(isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [isOpen, onClose, onNext, onPrev],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isOpen && current && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-val-bg/95 backdrop-blur-2xl"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={current.title}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close lightbox"
              className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-val-red/30 hover:text-white"
            >
              <X size={18} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              aria-label="Previous screenshot"
              className="absolute left-4 z-10 flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label="Next screenshot"
              className="absolute right-4 z-10 flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>

            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex flex-col w-full max-w-6xl h-[85vh] max-h-[85vh] md:max-h-[90vh] bg-val-bg border border-white/10 overflow-hidden shadow-2xl clip-angular"
              onClick={(e) => e.stopPropagation()}
            >
              <figure className="relative flex-1 w-full min-h-0 bg-black/40 flex items-center justify-center">
                <Image
                  src={
                    current.tempPreview
                      ? current.tempPreview
                      : current.image
                        ? urlFor(current.image).width(1600).fit("max").url()
                        : ""
                  }
                  alt={current.title}
                  fill
                  fetchPriority="high"
                  loading="eager"
                  sizes="(max-width: 1024px) 100vw, 1600px"
                  className="object-contain pointer-events-none"
                  priority
                />
              </figure>

              <footer className="bg-val-surface border-t border-white/10 p-4 shrink-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-oswald text-xl font-bold uppercase text-white tracking-wide">
                      {current.title}
                    </h3>
                    <p className="mt-1 text-xs text-white/50 flex items-center gap-1.5">
                      <span className="font-semibold text-val-teal uppercase">
                        {current.map?.name}
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="text-white/70">
                        {current.agent?.name}
                      </span>
                      {current.abilityType && (
                        <>
                          <span className="text-white/20">•</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/60 text-[10px] uppercase font-mono tracking-wider">
                            {current.abilityType}
                          </span>
                        </>
                      )}
                    </p>
                    {current.description && (
                      <p className="mt-2.5 text-xs text-white/40 leading-relaxed max-w-3xl">
                        {current.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0">
                    <span className="text-sm font-oswald font-semibold uppercase tracking-wider text-val-red px-2.5 py-1 bg-val-red/10 rounded border border-val-red/20">
                      {currentIndex + 1} / {screenshots.length}
                    </span>
                    <span className="text-[10px] text-white/20 font-mono hidden md:block">
                      ← → to navigate · ESC to close
                    </span>
                  </div>
                </div>
              </footer>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
