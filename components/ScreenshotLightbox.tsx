"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { urlFor } from "@/lib/sanity";

interface ScreenshotLightboxProps {
  screenshots: any[];
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

  return (
    <AnimatePresence>
      {isOpen && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/92 backdrop-blur-xl"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={20} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight size={20} />
          </button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={urlFor(current.image).width(1600).height(900).url()}
              alt={current.title}
              width={1600}
              height={900}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 p-4 backdrop-blur-md">
              <h3 className="font-oswald text-xl font-bold text-white">
                {current.title}
              </h3>
              <p className="mt-1 text-sm text-white/70">
                {current.map?.name} · {current.agent?.name} ·{" "}
                {current.abilityType}
              </p>
              {current.description && (
                <p className="mt-2 text-sm text-white/50">
                  {current.description}
                </p>
              )}
              <p className="mt-2 text-xs text-white/30">
                {currentIndex + 1} / {screenshots.length}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
