"use client";

import { motion } from "framer-motion";
import { urlFor } from "@/lib/sanity";
import Image from "next/image";

interface AgentCardProps {
  agent: any;
  viability?: string;
  isSelected: boolean;
  onClick: () => void;
}

const roleColors: Record<string, string> = {
  duelist: "#FF4655",
  controller: "#0FAF4B",
  sentinel: "#2E8DE5",
  initiator: "#F5A623",
};

const viabilityColors: Record<string, string> = {
  S: "#FF4655",
  A: "#F5A623",
  B: "#2E8DE5",
  C: "#8B97A8",
};

export default function AgentCard({
  agent,
  viability,
  isSelected,
  onClick,
}: AgentCardProps) {
  return (
    <motion.button
      layoutId={`agent-${agent._id}`}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`relative shrink-0 overflow-hidden rounded-md transition-[box-shadow,filter] w-[80px] h-[100px] ${
        isSelected
          ? "ring-2 ring-[#FF4655] shadow-lg shadow-[#FF4655]/20"
          : "ring-1 ring-white/10 hover:ring-white/30 hover:brightness-110"
      }`}
    >
      {agent.image && (
        <Image
          src={urlFor(agent.image).width(160).height(200).url()}
          alt={agent.name}
          fill
          className="object-cover object-top transition-[filter] duration-300"
          sizes="80px"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />

      {viability && (
        <div
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm"
          style={{ backgroundColor: viabilityColors[viability] || "#8B97A8" }}
        >
          {viability}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-1.5">
        <p className="font-oswald text-xs font-bold uppercase tracking-wide text-white leading-tight">
          {agent.name}
        </p>
        <p
          className="mt-0 text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: roleColors[agent.role] || "#8B97A8" }}
        >
          {agent.role}
        </p>
      </div>

      {isSelected && (
        <motion.div
          layoutId="agent-indicator"
          className="absolute bottom-0 left-0 right-0 h-1 bg-[#FF4655]"
        />
      )}
    </motion.button>
  );
}
