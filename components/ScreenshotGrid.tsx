"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { urlFor } from "@/lib/sanity";
import ScreenshotLightbox from "./ScreenshotLightbox";

interface ScreenshotGridProps {
  screenshots: any[];
}

export default function ScreenshotGrid({ screenshots }: ScreenshotGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {screenshots.map((screenshot, i) => (
          <ScreenshotCard
            key={screenshot._id}
            screenshot={screenshot}
            index={i}
            onOpen={() => setLightboxIndex(i)}
          />
        ))}
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
  );
}

function ScreenshotCard({
  screenshot,
  index,
  onOpen,
}: {
  screenshot: any;
  index: number;
  onOpen: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onOpen}
      className="group relative cursor-pointer overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10 transition-[box-shadow,filter] hover:ring-white/30 hover:brightness-105"
    >
      <div className="relative h-48 w-full bg-black/30">
        <Image
          src={urlFor(screenshot.image).width(800).height(450).url()}
          alt={screenshot.title}
          fill
          className="object-contain transition-[filter] duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium text-white">{screenshot.title}</p>
      </div>
    </motion.div>
  );
}
