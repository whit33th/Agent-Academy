"use client";

import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Plus, X, Loader2, Upload, Search } from "lucide-react";
import type { Agent } from "@/lib/types";

interface AgentGridProps {
  agents: Agent[];
  allAgents?: Agent[];
  unaddedAgents?: any[];
  selectedMapSlug?: string;
  selectedMapName?: string;
}

/**
 * Custom framing config to achieve the exact Valorant agent select crop:
 * Aspect ratio is now wider (3/4.2) matching the reference.
 * Zoom is kept minimal (scale: 1.15 to 1.3) to guarantee 100% sharp, high-definition images.
 * Positives/offsets pull the head/chest perfectly into center view.
 */
const agentPortraitConfig: Record<
  string,
  {
    scale: number;
    x: number;
    y: number;
    objectPosition: string;
  }
> = {
  jett: {
    scale: 1.75,
    x: -26,
    y: 60,
    objectPosition: "center 2%",
  },
  phoenix: {
    scale: 1.75,
    x: -1,
    y: 70,
    objectPosition: "center 2%",
  },
  sage: {
    scale: 1.75,
    x: 28,
    y: 67,
    objectPosition: "center 2%",
  },
  sova: {
    scale: 1.75,
    x: 4,
    y: 80,
    objectPosition: "center 2%",
  },
  viper: {
    scale: 1.75,
    x: 4,
    y: 60,
    objectPosition: "center 2%",
  },
  cypher: {
    scale: 1.75,
    x: 14,
    y: 73,
    objectPosition: "center 2%",
  },
  brimstone: {
    scale: 1.35,
    x: 4,
    y: 18,
    objectPosition: "center 12%",
  },
  killjoy: {
    scale: 1.75,
    x: 9,
    y: 62,
    objectPosition: "center 2%",
  },
  breach: {
    scale: 1.71,
    x: 10,
    y: 70,
    objectPosition: "center 2%",
  },
  omen: {
    scale: 1.75,
    x: 9,
    y: 65,
    objectPosition: "center 2%",
  },
  raze: {
    scale: 1.75,
    x: -5,
    y: 60,
    objectPosition: "center 2%",
  },
  reyna: {
    scale: 1.75,
    x: 9,
    y: 60,
    objectPosition: "center 2%",
  },
  skye: {
    scale: 1.75,
    x: -2,
    y: 71,
    objectPosition: "center 2%",
  },
  yoru: {
    scale: 1.73,
    x: 9,
    y: 62,
    objectPosition: "center 2%",
  },
  astra: {
    scale: 1.75,
    x: 72,
    y: 60,
    objectPosition: "center 2%",
  },
  "kay/o": {
    scale: 1.6,
    x: 40,
    y: 60,
    objectPosition: "center 2%",
  },
  chamber: {
    scale: 1.75,
    x: 0,
    y: 70,
    objectPosition: "center 2%",
  },
  neon: {
    scale: 1.75,
    x: 22,
    y: 70,
    objectPosition: "center 2%",
  },
  fade: {
    scale: 1.75,
    x: 13,
    y: 80,
    objectPosition: "center 2%",
  },
  harbor: {
    scale: 1.75,
    x: 12,
    y: 65,
    objectPosition: "center 2%",
  },
  gekko: {
    scale: 1.75,
    x: -15,
    y: 65,
    objectPosition: "center 2%",
  },
  deadlock: {
    scale: 1.75,
    x: 20,
    y: 65,
    objectPosition: "center 2%",
  },
  iso: {
    scale: 1.75,
    x: 3,
    y: 55,
    objectPosition: "center 2%",
  },
  clove: {
    scale: 1.75,
    x: 23,
    y: 80,
    objectPosition: "center 2%",
  },
  vyse: {
    scale: 1.73,
    x: 9,
    y: 90,
    objectPosition: "center 2%",
  },
  tejo: {
    scale: 1.75,
    x: 9,
    y: 80,
    objectPosition: "center 2%",
  },
  miks: {
    scale: 1.75,
    x: -21,
    y: 90,
    objectPosition: "center 2%",
  },
  veto: {
    scale: 1.75,
    x: -15,
    y: 96,
    objectPosition: "center 2%",
  },
  waylay: {
    scale: 1.75,
    x: 33,
    y: 60,
    objectPosition: "center 2%",
  },
};

const defaultConfig = {
  scale: 1.25,
  x: 0,
  y: 24,
  objectPosition: "center 8%",
};

const slotToKey: Record<string, string> = {
  ability1: "Q",
  ability2: "E",
  grenade: "C",
  ultimate: "X",
  passive: "Passive",
};

const getSlotKey = (slot: string) => {
  return slotToKey[slot.toLowerCase()] || slot;
};

function mapAbilityToGenericType(
  slot: string,
  displayName: string,
  description: string
): string {
  const name = (displayName || "").toLowerCase();
  const desc = (description || "").toLowerCase();
  const s = (slot || "").toLowerCase();

  if (s === "ultimate") return "ultimate";

  if (
    name.includes("smoke") || name.includes("cloud") || name.includes("nebula") ||
    desc.includes("smoke") || desc.includes("cloud") || desc.includes("block vision")
  ) {
    return "smoke";
  }
  if (
    name.includes("wall") || name.includes("barrier") || name.includes("screen") ||
    desc.includes("wall") || desc.includes("barrier") || desc.includes("screen")
  ) {
    return "wall";
  }
  if (
    name.includes("flash") || name.includes("blind") || name.includes("guiding light") || name.includes("flashbang") ||
    desc.includes("flash") || desc.includes("blind")
  ) {
    return "flash";
  }
  if (
    name.includes("molly") || name.includes("swarm") || name.includes("grenade") || name.includes("bite") || name.includes("incendiary") || name.includes("fire") ||
    desc.includes("molly") || desc.includes("swarm") || desc.includes("grenade") || desc.includes("burning") || desc.includes("damage over time")
  ) {
    return "molly";
  }
  if (
    name.includes("recon") || name.includes("scan") || name.includes("reveal") || name.includes("sensor") || name.includes("dart") || name.includes("drone") || name.includes("camera") || name.includes("spy") ||
    desc.includes("scan") || desc.includes("reveal") || desc.includes("detect") || desc.includes("sonar")
  ) {
    return "recon";
  }
  if (
    name.includes("heal") || name.includes("support") || name.includes("revive") ||
    desc.includes("heal") || desc.includes("revive") || desc.includes("health")
  ) {
    return "heal";
  }

  return "other";
}

export default function AgentGrid({
  agents,
  allAgents = [],
  unaddedAgents = [],
  selectedMapSlug,
  selectedMapName,
}: AgentGridProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedAgentSlug, setSelectedAgentSlug] = useState("");
  const [selectedAbilitySlot, setSelectedAbilitySlot] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Add Agent Modal states
  const [isAddAgentModalOpen, setIsAddAgentModalOpen] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [addAgentError, setAddAgentError] = useState<string | null>(null);

  const agentsForDropdown = allAgents.length > 0 ? allAgents : agents;
  
  const selectedAgentObj = agentsForDropdown.find(
    (a) => (a.slug?.current ?? a._id) === selectedAgentSlug
  );

  // Auto-select first ability when agent changes
  useEffect(() => {
    if (selectedAgentObj && selectedAgentObj.abilities && selectedAgentObj.abilities.length > 0) {
      setSelectedAbilitySlot(selectedAgentObj.abilities[0].slot);
    } else {
      setSelectedAbilitySlot("");
    }
  }, [selectedAgentSlug, selectedAgentObj]);

  // Lock body scroll when upload modal or add agent modal is open
  useEffect(() => {
    if (isUploadModalOpen || isAddAgentModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isUploadModalOpen, isAddAgentModalOpen]);

  const handleAddAgent = async (agentName: string) => {
    setIsAddingAgent(true);
    setAddAgentError(null);
    try {
      const res = await fetch("/api/add-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add agent");
      }
      setIsAddAgentModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setAddAgentError(err.message || "Error adding agent");
    } finally {
      setIsAddingAgent(false);
    }
  };

  const filteredUnaddedAgents = (unaddedAgents || []).filter((agent) =>
    (agent.displayName || "")
      .toLowerCase()
      .includes(agentSearchQuery.toLowerCase())
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setUploadError("Please select a screenshot image.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("mapSlug", selectedMapSlug || "");
    formData.append("mapName", selectedMapName || "");
    formData.append("agentSlug", selectedAgentSlug);
    formData.append("agentName", selectedAgentObj?.name || "");
    formData.append("title", title);
    formData.append("description", description);

    // Map selection to generic ability type for validation/filtering compatibility
    const selectedAbilityObj = selectedAgentObj?.abilities.find(
      (a) => a.slot === selectedAbilitySlot
    );
    const genericAbilityType = mapAbilityToGenericType(
      selectedAbilitySlot,
      selectedAbilityObj?.displayName || "",
      selectedAbilityObj?.description || ""
    );
    formData.append("abilityType", genericAbilityType);
    
    formData.append("image", imageFile);

    try {
      const res = await fetch("/api/upload-screenshot", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload screenshot");
      }

      setIsUploadModalOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setTitle("");
      setDescription("");
      
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* High-fidelity Valorant Agent Select Screen Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 ">
          {agents.map((agent, i) => {
            const viability = agent.viability;
            const slug = agent.slug?.current ?? agent._id;
            const gradientColors = agent.backgroundGradientColors || [];
            const agentName = (agent.name || "").toLowerCase();

            // Get individual config for tight zoom/framing
            const portraitCfg = agentPortraitConfig[agentName] || defaultConfig;

            // Generate card background gradient based on Valorant colors
            const hexColors = gradientColors.map(
              (c: string) => `#${c.slice(0, 6)}`,
            );
            const cardBg =
              hexColors.length >= 2
                ? `linear-gradient(180deg, ${hexColors[0]}99 0%, ${hexColors[1]}66 60%, #0a0a0a 100%)`
                : "linear-gradient(180deg, #1b2733 0%, #0f1923 100%)";

            const primaryColor = hexColors[0] || "#0faf4b";

            const params = new URLSearchParams();
            if (selectedMapSlug) params.set("map", selectedMapSlug);
            params.set("agent", slug);

            return (
              <m.div
                key={agent._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
              >
                <Link
                  href={`/?${params.toString()}`}
                  className="group relative block w-full h-[340px] overflow-visible transition-all duration-200 hover:-translate-y-1.5"
                >
                  {/* Card Background & Clip Container */}
                  <div
                    className="absolute inset-x-0 bottom-0 top-5 overflow-hidden clip-angular border border-white/5 transition-all duration-200 group-hover:border-[var(--agent-accent)]/80 group-hover:shadow-[0_12px_30px_var(--agent-accent-shadow)]"
                    style={
                      {
                        background: cardBg,
                        "--agent-accent": primaryColor,
                        "--agent-accent-shadow": `${primaryColor}26`,
                      } as React.CSSProperties
                    }
                  >
                    {/* Character background element */}
                    {agent.background && (
                      <Image
                        src={agent.background}
                        alt=""
                        fill
                        className="object-cover object-center scale-120 mix-blend-color-burn opacity-10 "
                      />
                    )}
                  </div>

                  {/* Agent portrait with top popout and side clipping */}
                  {agent.imageUrl && (
                    <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden pointer-events-none z-10">
                      {/* Parent handles absolute pixel translations */}
                      <div
                        className="absolute inset-0"
                        style={{
                          transform: `translate3d(${portraitCfg.x}px, ${portraitCfg.y}px, 0)`,
                        }}
                      >
                        {/* Child handles custom agent scale and hover zoom via CSS variable multiplier */}
                        <div
                          className="absolute inset-0 transition-transform duration-200 ease-out [--zoom-multiplier:1] group-hover:[--zoom-multiplier:1.05]"
                          style={{
                            transform: `scale(calc(${portraitCfg.scale} * var(--zoom-multiplier, 1)))`,
                          }}
                        >
                          <Image
                            src={agent.imageUrl}
                            alt={agent.name}
                            fill
                            sizes="200vw"
                            className="object-cover drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
                            style={{
                              objectPosition: portraitCfg.objectPosition,
                            }}
                            priority={i < 6}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom overlay for name contrast */}
                  <div className="absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

                  {/* Agent Name & Details at the bottom */}
                  <div className="absolute inset-x-0 bottom-0 z-30 p-3 pointer-events-none">
                    <p className="font-oswald text-lg font-bold uppercase tracking-wider text-white text-center group-hover:text-[var(--agent-accent)] transition-colors">
                      {agent.name}
                    </p>
                    {agent.roleName && (
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">
                        {agent.roleIcon && (
                          <div className="relative size-2.5 opacity-60 group-hover:opacity-100 group-hover:scale-109 transition-[scale,opacity] duration-200">
                            <Image src={agent.roleIcon} alt="" fill />
                          </div>
                        )}
                        <span>{agent.roleName}</span>
                      </div>
                    )}
                  </div>

                  {/* Left color bar representing role accent */}
                  <div
                    className="absolute left-0 top-5 bottom-0 w-px z-40"
                    style={{ backgroundColor: primaryColor }}
                  />
                  {/* bottom color bar representing role accent */}
                  <div
                    className="absolute left-0 bottom-0 right-0 w-full h-px z-40"
                    style={{ backgroundColor: primaryColor }}
                  />
                  {/* Viability tag */}
                  {viability && (
                    <div
                      className="absolute right-3 top-8 z-40 flex size-7 items-center justify-center font-oswald text-xs font-bold text-white shadow-lg clip-diamond"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {viability}
                    </div>
                  )}
                </Link>
              </m.div>
            );
          })}

          {/* Add Agent Card */}
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: agents.length * 0.02, duration: 0.25 }}
          >
            <button
              onClick={() => {
                setIsAddAgentModalOpen(true);
              }}
              className="group relative block w-full h-[340px] overflow-visible transition-all duration-200 hover:-translate-y-1.5 cursor-pointer text-left border-0 outline-none p-0 bg-transparent"
            >
              {/* Card Background & Clip Container */}
              <div
                className="absolute inset-x-0 bottom-0 top-5 overflow-hidden clip-angular border border-white/5 bg-gradient-to-b from-zinc-800/40 to-zinc-950/80 transition-all duration-200 group-hover:border-val-red/80 group-hover:shadow-[0_12px_30px_rgba(255,70,85,0.15)]"
              >
                {/* Silhouette Character Image */}
                <div className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity duration-200">
                  <Image
                    src="/new_agent_card.png"
                    alt="Add Agent background"
                    fill
                    className="object-cover object-top"
                  />
                </div>

                {/* Big Plus in the center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="flex size-14 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:border-val-red/40 group-hover:bg-val-red/10 text-white/40 group-hover:text-val-red transition-all">
                    <Plus size={32} />
                  </div>
                </div>
              </div>

              {/* Bottom overlay for name contrast */}
              <div className="absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

              {/* Text at the bottom */}
              <div className="absolute inset-x-0 bottom-0 z-30 p-3 text-center">
                <p className="font-oswald text-lg font-bold uppercase tracking-wider text-white group-hover:text-val-red transition-colors">
                  Add Agent
                </p>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">
                  <span>Try someone new!</span>
                </div>
              </div>

              {/* Left color bar representing accent */}
              <div className="absolute left-0 top-5 bottom-0 w-px z-40 bg-zinc-600 group-hover:bg-val-red transition-colors" />
              {/* bottom color bar representing accent */}
              <div className="absolute left-0 bottom-0 right-0 w-full h-px z-40 bg-zinc-600 group-hover:bg-val-red transition-colors" />
            </button>
          </m.div>
        </div>
      </m.div>

      {/* Upload Screenshot Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" data-lenis-prevent>
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-val-surface border border-white/10 clip-angular my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-oswald text-xl font-bold uppercase text-white">
                Share Lineup Setup
              </h3>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setImageFile(null);
                  setImagePreview(null);
                  setUploadError(null);
                }}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-4 flex flex-col gap-4">
              {uploadError && (
                <div className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2.5 rounded-sm">
                  {uploadError}
                </div>
              )}

              {/* Agent Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Agent
                </label>
                <select
                  value={selectedAgentSlug}
                  onChange={(e) => setSelectedAgentSlug(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white"
                >
                  {agentsForDropdown.map((agent) => (
                    <option
                      key={agent._id}
                      value={agent.slug?.current ?? agent._id}
                      className="bg-val-surface text-white"
                    >
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ability Selector Grid */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Ability
                </label>
                {selectedAgentObj && selectedAgentObj.abilities && selectedAgentObj.abilities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedAgentObj.abilities.map((ability) => {
                      const isSelected = selectedAbilitySlot === ability.slot;
                      const keyBind = getSlotKey(ability.slot);

                      return (
                        <button
                          key={ability.slot}
                          type="button"
                          onClick={() => setSelectedAbilitySlot(ability.slot)}
                          className={`group relative flex flex-col items-center justify-center p-3 rounded-sm border transition-all cursor-pointer select-none text-center h-24 ${
                            isSelected
                              ? "border-val-red bg-val-red/10 text-white shadow-[0_0_15px_rgba(255,70,85,0.2)]"
                              : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20"
                          }`}
                        >
                          {/* Key Bind Badge */}
                          <span className="absolute top-1.5 right-1.5 px-1 py-0.5 text-[9px] font-bold font-oswald bg-black/60 rounded-sm text-white/80 group-hover:text-white">
                            {keyBind}
                          </span>

                          {/* Ability Icon */}
                          {ability.displayIcon ? (
                            <div className="relative size-8 mb-1.5 transition-transform duration-200 group-hover:scale-110">
                              <Image
                                src={ability.displayIcon}
                                alt={ability.displayName}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="size-8 mb-1.5 flex items-center justify-center bg-white/5 rounded-sm">
                              <span className="text-[10px] font-bold text-white/30">{keyBind}</span>
                            </div>
                          )}

                          {/* Ability Name */}
                          <span className="text-[10px] font-bold uppercase tracking-wider truncate w-full px-1">
                            {ability.displayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-white/40 italic">
                    Please select an agent to see their abilities.
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. A Site Default Plant Molly"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Description / Notes
                </label>
                <textarea
                  placeholder="Describe where to stand and where to aim..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white resize-none"
                />
              </div>

              {/* Image Upload Area */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Screenshot
                </label>
                {imagePreview ? (
                  <div className="relative aspect-video w-full rounded-sm overflow-hidden border border-white/10 group bg-black/40">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-val-red text-white transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-video border border-dashed border-white/15 rounded-sm hover:border-val-red/40 hover:bg-white/1 cursor-pointer transition-all">
                    <div className="flex flex-col items-center gap-1 text-white/40">
                      <Upload className="size-8 mb-1" />
                      <span className="text-sm font-medium">Click to upload screenshot</span>
                      <span className="text-[10px] text-white/30">PNG, JPG, WebP up to 10MB</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      required
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setImageFile(null);
                    setImagePreview(null);
                    setUploadError(null);
                  }}
                  className="px-4 h-10 rounded-sm hover:bg-white/5 text-sm text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex items-center gap-2 px-6 h-10 bg-val-red hover:bg-val-red/90 text-sm font-bold uppercase tracking-wider text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Share Setup"
                  )}
                </button>
              </div>
            </form>
          </m.div>
        </div>
      )}

      {/* Add Agent Modal */}
      {isAddAgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md overflow-hidden bg-val-surface border border-white/10 clip-angular"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-oswald text-xl font-bold uppercase text-white">
                Register Agent
              </h3>
              <button
                onClick={() => {
                  setIsAddAgentModalOpen(false);
                  setAgentSearchQuery("");
                  setAddAgentError(null);
                }}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-4">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search agent..."
                  value={agentSearchQuery}
                  onChange={(e) => setAgentSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white"
                />
              </div>

              {addAgentError && (
                <div className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2 rounded-sm">
                  {addAgentError}
                </div>
              )}

              {/* List of agents */}
              <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar" data-lenis-prevent>
                {filteredUnaddedAgents.length > 0 ? (
                  filteredUnaddedAgents.map((agent) => (
                    <button
                      key={agent.uuid}
                      disabled={isAddingAgent}
                      onClick={() => handleAddAgent(agent.displayName)}
                      className="group flex items-center justify-between p-2 rounded-sm bg-white/3 hover:bg-val-red/10 border border-white/5 hover:border-val-red/30 text-left transition-all cursor-pointer disabled:opacity-50 w-full"
                    >
                      <div className="flex items-center gap-3">
                        {agent.displayIcon && (
                          <div className="relative size-12 rounded-sm overflow-hidden bg-black/40 flex-shrink-0">
                            <Image
                              src={agent.displayIcon}
                              alt={agent.displayName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-white group-hover:text-val-red transition-colors block">
                            {agent.displayName}
                          </span>
                          {agent.role?.displayName && (
                            <span className="text-[10px] text-white/40">
                              {agent.role.displayName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wider text-val-red opacity-0 group-hover:opacity-100 transition-opacity">
                        {isAddingAgent ? "Adding..." : "Add"}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-white/40">
                    No unadded agents found.
                  </div>
                )}
              </div>
            </div>
          </m.div>
        </div>
      )}
    </LazyMotion>
  );
}

