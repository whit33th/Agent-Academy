"use client";

import { motion } from "framer-motion";
import { urlFor } from "@/lib/sanity";
import Image from "next/image";

interface MapCardProps {
  map: any;
  isSelected: boolean;
  onClick: () => void;
}

export default function MapCard({ map, isSelected, onClick }: MapCardProps) {
  return (
    <motion.button
      layoutId={`map-${map._id}`}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`relative shrink-0 overflow-hidden rounded-md transition-[box-shadow,filter] w-[88px] h-[100px] ${
        isSelected
          ? "ring-2 ring-[#FF4655] shadow-lg shadow-[#FF4655]/20"
          : "ring-1 ring-white/10 hover:ring-white/30 hover:brightness-110"
      }`}
    >
      {map.image && (
        <Image
          src={urlFor(map.image).width(176).height(200).url()}
          alt={map.name}
          fill
          className="object-cover transition-[filter] duration-300"
          sizes="88px"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="font-oswald text-xs font-bold uppercase tracking-wide text-white">
          {map.name}
        </p>
      </div>
      {isSelected && (
        <motion.div
          layoutId="map-indicator"
          className="absolute bottom-0 left-0 right-0 h-1 bg-[#FF4655]"
        />
      )}
    </motion.button>
  );
}
