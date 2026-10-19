"use client";

import { useEffect, useEffectEvent } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/utils/body-scroll-lock";
import { audio as sfx } from "@/lib/audio";
import { restartOnboarding } from "@/lib/onboarding/state";

interface LineupHotkeysHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "F", desc: "Toggle favorite on open setup, or favorites-only filter" },
  { key: "R", desc: "Open a random setup from the current filter" },
  { key: "?", desc: "Show this shortcuts panel" },
  { key: "← →", desc: "Previous / next setup in lightbox" },
  { key: "Esc", desc: "Close lightbox or this panel" },
] as const;

export default function LineupHotkeysHelp({
  open,
  onClose,
}: LineupHotkeysHelpProps) {
  useBodyScrollLock(open);

  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-val-bg/80 backdrop-blur-sm p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <m.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md clip-angular border border-white/10 bg-val-surface p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-oswald text-xl font-bold uppercase text-white">
                Shortcuts
              </h2>
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  onClose();
                }}
                aria-label="Close shortcuts"
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-3">
              {SHORTCUTS.map(({ key, desc }) => (
                <li key={key} className="flex items-start gap-3 text-sm">
                  <kbd className="shrink-0 min-w-[2.5rem] text-center px-2 py-1 clip-angular-sm bg-white/8 text-[11px] font-bold text-val-red border border-white/10">
                    {key}
                  </kbd>
                  <span className="text-white/55 leading-snug pt-0.5">{desc}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => {
                  sfx.playClick();
                  restartOnboarding();
                  onClose();
                  window.location.href = "/";
                }}
                className="text-xs font-bold uppercase tracking-wider text-white/35 hover:text-val-red transition-colors cursor-pointer"
              >
                Restart tour
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
