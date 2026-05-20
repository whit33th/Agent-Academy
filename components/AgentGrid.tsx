"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Upload, Search, Trash2 } from "lucide-react";
import type { Agent } from "@/lib/types";

interface AgentGridProps {
  agents: Agent[];
  allAgents?: Agent[];
  unaddedAgents?: any[];
  selectedMapSlug?: string;
  selectedMapName?: string;
  selectedMapId?: string | null;
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
  description: string,
): string {
  const name = (displayName || "").toLowerCase();
  const desc = (description || "").toLowerCase();
  const s = (slot || "").toLowerCase();

  if (s === "ultimate") return "ultimate";

  if (
    name.includes("smoke") ||
    name.includes("cloud") ||
    name.includes("nebula") ||
    desc.includes("smoke") ||
    desc.includes("cloud") ||
    desc.includes("block vision")
  ) {
    return "smoke";
  }
  if (
    name.includes("wall") ||
    name.includes("barrier") ||
    name.includes("screen") ||
    desc.includes("wall") ||
    desc.includes("barrier") ||
    desc.includes("screen")
  ) {
    return "wall";
  }
  if (
    name.includes("flash") ||
    name.includes("blind") ||
    name.includes("guiding light") ||
    name.includes("flashbang") ||
    desc.includes("flash") ||
    desc.includes("blind")
  ) {
    return "flash";
  }
  if (
    name.includes("molly") ||
    name.includes("swarm") ||
    name.includes("grenade") ||
    name.includes("bite") ||
    name.includes("incendiary") ||
    name.includes("fire") ||
    desc.includes("molly") ||
    desc.includes("swarm") ||
    desc.includes("grenade") ||
    desc.includes("burning") ||
    desc.includes("damage over time")
  ) {
    return "molly";
  }
  if (
    name.includes("recon") ||
    name.includes("scan") ||
    name.includes("reveal") ||
    name.includes("sensor") ||
    name.includes("dart") ||
    name.includes("drone") ||
    name.includes("camera") ||
    name.includes("spy") ||
    desc.includes("scan") ||
    desc.includes("reveal") ||
    desc.includes("detect") ||
    desc.includes("sonar")
  ) {
    return "recon";
  }
  if (
    name.includes("heal") ||
    name.includes("support") ||
    name.includes("revive") ||
    desc.includes("heal") ||
    desc.includes("revive") ||
    desc.includes("health")
  ) {
    return "heal";
  }

  return "other";
}

const rankPriority: Record<string, number> = {
  S: 1,
  A: 2,
  B: 3,
  C: 4,
  D: 5,
};

const getViabilityStyle = (viability: string) => {
  const v = viability.toUpperCase();
  if (v === "S") {
    return {
      backgroundColor: "#f6de83",
      boxShadow: "0 0 12px rgba(255, 70, 85, 0.6)",
      borderColor: "rgba(255, 70, 85, 0.8)",
    };
  }
  if (v === "A") {
    return {
      backgroundColor: "#b93757",
      boxShadow: "0 0 12px rgba(245, 166, 35, 0.6)",
      borderColor: "rgba(245, 166, 35, 0.8)",
    };
  }
  if (v === "B") {
    return {
      backgroundColor: "#1e7e58 ",
      boxShadow: "0 0 12px rgba(46, 141, 229, 0.6)",
      borderColor: "rgba(46, 141, 229, 0.8)",
    };
  }
  if (v === "C") {
    return {
      backgroundColor: "#8657a8",
      boxShadow: "0 0 6px rgba(85, 85, 85, 0.4)",
      borderColor: "rgba(85, 85, 85, 0.6)",
    };
  }
  if (v === "D") {
    return {
      backgroundColor: "#428b9d",
      boxShadow: "0 0 4px rgba(51, 51, 51, 0.4)",
      borderColor: "rgba(51, 51, 51, 0.6)",
    };
  }
  return {
    backgroundColor: "#cd9f41",
    boxShadow: "none",
    borderColor: "rgba(255, 255, 255, 0.1)",
  };
};

export default function AgentGrid({
  agents,
  allAgents = [],
  unaddedAgents = [],
  selectedMapSlug,
  selectedMapName,
  selectedMapId,
}: AgentGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [localAgents, setLocalAgents] = useState<Agent[]>(agents);
  const [selectedAgentForModal, setSelectedAgentForModal] =
    useState<Agent | null>(null);

  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isLongPressActive = useRef(false);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (agent: Agent) => (e: React.PointerEvent) => {
    // Only handle primary button (left click) or touch
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isLongPressActive.current = false;
    startCoordsRef.current = { x: e.clientX, y: e.clientY };

    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setSelectedAgentForModal(agent);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startCoordsRef.current || !longPressTimeoutRef.current) return;
    const dx = e.clientX - startCoordsRef.current.x;
    const dy = e.clientY - startCoordsRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 10) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
      startCoordsRef.current = null;
    }
  };

  const handlePointerUpOrLeave = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    startCoordsRef.current = null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (!selectedMapId) return;
    if (
      confirm(
        `Are you sure you want to delete the agent "${agent.name}"? This will also delete all of their screenshots.`,
      )
    ) {
      const oldAgents = [...localAgents];
      setLocalAgents((prev) => prev.filter((a) => a._id !== agent._id));

      try {
        const res = await fetch("/api/delete-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent._id, mapId: selectedMapId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete agent");
        }
        startTransition(() => {
          router.refresh();
        });
      } catch (err: any) {
        alert(err.message || "An error occurred");
        setLocalAgents(oldAgents);
      }
    }
  };

  const handleUpdateViability = async (agent: Agent, tier: string | null) => {
    if (!selectedMapId) return;
    const oldAgents = [...localAgents];

    // Optimistic Update
    setLocalAgents((prev) =>
      prev.map((a) => (a._id === agent._id ? { ...a, viability: tier } : a)),
    );
    setSelectedAgentForModal(null);

    try {
      const res = await fetch("/api/update-agent-viability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent._id,
          mapId: selectedMapId,
          viability: tier,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update viability");
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      alert(err.message || "An error occurred");
      setLocalAgents(oldAgents);
    }
  };

  const sortedAgents = [...localAgents].sort((a, b) => {
    const viaA = a.viability;
    const viaB = b.viability;
    const hasViaA = !!viaA;
    const hasViaB = !!viaB;

    if (hasViaA && !hasViaB) return -1;
    if (!hasViaA && hasViaB) return 1;

    if (hasViaA && hasViaB) {
      const pA = rankPriority[viaA!.toUpperCase()] ?? 99;
      const pB = rankPriority[viaB!.toUpperCase()] ?? 99;
      if (pA !== pB) {
        return pA - pB;
      }
    }

    return (a.name || "").localeCompare(b.name || "");
  });

  useEffect(() => {
    setLocalAgents(agents);
  }, [agents]);

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

  const agentsForDropdown = allAgents.length > 0 ? allAgents : localAgents;

  const selectedAgentObj = agentsForDropdown.find(
    (a) => (a.slug?.current ?? a._id) === selectedAgentSlug,
  );

  // Auto-select first ability when agent changes
  useEffect(() => {
    if (
      selectedAgentObj &&
      selectedAgentObj.abilities &&
      selectedAgentObj.abilities.length > 0
    ) {
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
    const oldAgents = [...localAgents];

    // Find the unadded agent info to show its portrait immediately
    const apiAgent = (unaddedAgents || []).find(
      (a) => a.displayName === agentName,
    );
    const optimisticAgent: Agent = {
      _id: `optimistic-${Date.now()}`,
      name: agentName,
      imageUrl: apiAgent?.fullPortrait || apiAgent?.displayIcon || null,
      fullPortraitV2: apiAgent?.fullPortraitV2 || null,
      bustPortrait: apiAgent?.bustPortrait || null,
      displayIcon: apiAgent?.displayIcon || null,
      roleName: apiAgent?.role?.displayName || "",
      roleIcon: apiAgent?.role?.displayIcon || null,
      description: apiAgent?.description || "",
      abilities: apiAgent?.abilities || [],
      background: apiAgent?.background || null,
      backgroundGradientColors: apiAgent?.backgroundGradientColors || [],
      slug: {
        current: (agentName || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
      },
    };

    setLocalAgents((prev) => [...prev, optimisticAgent]);
    setIsAddAgentModalOpen(false);

    try {
      const res = await fetch("/api/add-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName, mapSlug: selectedMapSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add agent");
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error(err);
      setAddAgentError(err.message || "Error adding agent");
      setLocalAgents(oldAgents); // Rollback
    } finally {
      setIsAddingAgent(false);
    }
  };

  const filteredUnaddedAgents = (unaddedAgents || []).filter((agent) =>
    (agent.displayName || "")
      .toLowerCase()
      .includes(agentSearchQuery.toLowerCase()),
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
      (a) => a.slot === selectedAbilitySlot,
    );
    const genericAbilityType = mapAbilityToGenericType(
      selectedAbilitySlot,
      selectedAbilityObj?.displayName || "",
      selectedAbilityObj?.description || "",
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

      startTransition(() => {
        router.refresh();
      });
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
          {sortedAgents.map((agent, i) => {
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
                key={agent.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
              >
                <Link
                  href={`/?${params.toString()}`}
                  onPointerDown={handlePointerDown(agent)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUpOrLeave}
                  onPointerCancel={handlePointerUpOrLeave}
                  onPointerLeave={handlePointerUpOrLeave}
                  onClick={handleCardClick}
                  onContextMenu={(e) => e.preventDefault()}
                  className="group relative block w-full h-[340px] overflow-visible transition-all duration-200 hover:-translate-y-1.5 select-none touch-pan-y touch-callout-none"
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
                    <div className="absolute right-2.5 top-7.5 z-40 flex size-10 items-center justify-center select-none filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                      <Image
                        src={`/ranks/${viability.toLowerCase()}.png`}
                        alt={`${viability} Rank`}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
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
            transition={{ delay: localAgents.length * 0.02, duration: 0.25 }}
          >
            <button
              onClick={() => {
                setIsAddAgentModalOpen(true);
              }}
              className="group relative block w-full h-[340px] overflow-visible transition-all duration-200 hover:-translate-y-1.5 cursor-pointer text-left border-0 outline-none p-0 bg-transparent"
            >
              {/* Card Background & Clip Container */}
              <div className="absolute inset-x-0 bottom-0 top-5 overflow-hidden clip-angular border border-white/5 bg-gradient-to-b from-zinc-800/40 to-zinc-950/80 transition-all duration-200 group-hover:border-val-red/80 group-hover:shadow-[0_12px_30px_rgba(255,70,85,0.15)]">
                {/* Silhouette Character Image */}
                <div className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity duration-200">
                  <Image
                    src="/new_agent_card.png"
                    alt="Add Agent background"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          data-lenis-prevent
        >
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
            <form
              onSubmit={handleUploadSubmit}
              className="p-4 flex flex-col gap-4"
            >
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
                {selectedAgentObj &&
                selectedAgentObj.abilities &&
                selectedAgentObj.abilities.length > 0 ? (
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
                                sizes="64px"
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="size-8 mb-1.5 flex items-center justify-center bg-white/5 rounded-sm">
                              <span className="text-[10px] font-bold text-white/30">
                                {keyBind}
                              </span>
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
                      sizes="(max-width: 480px) 100vw, 450px"
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
                      <span className="text-sm font-medium">
                        Click to upload screenshot
                      </span>
                      <span className="text-[10px] text-white/30">
                        PNG, JPG, WebP up to 10MB
                      </span>
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

              {/* Grid of agents */}
              <div
                className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar"
                data-lenis-prevent
              >
                {filteredUnaddedAgents.length > 0 ? (
                  <div className="grid grid-cols-5 gap-2">
                    {filteredUnaddedAgents.map((agent) => (
                      <button
                        key={agent.uuid}
                        disabled={isAddingAgent}
                        onClick={() => handleAddAgent(agent.displayName)}
                        className="group relative aspect-square w-full rounded-sm overflow-hidden bg-white/3 hover:bg-val-red/10 border border-white/5 hover:border-val-red/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        title={agent.displayName}
                      >
                        {agent.displayIcon && (
                          <Image
                            src={agent.displayIcon}
                            alt={agent.displayName}
                            fill
                            sizes="160px"
                            className="object-cover transition-transform duration-200 group-hover:scale-110"
                          />
                        )}
                        {/* Name overlay on hover */}
                        <div className="absolute inset-x-0 bottom-0  text-[9px] text-center font-bold text-white py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none truncate px-0.5">
                          {agent.displayName}
                        </div>
                      </button>
                    ))}
                  </div>
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

      {/* Agent Actions Modal */}
      {selectedAgentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-val-surface border border-white/10 clip-angular overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-oswald text-lg font-bold uppercase text-white truncate">
                Agent Actions: {selectedAgentForModal.name}
              </h3>
              <button
                onClick={() => setSelectedAgentForModal(null)}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-4">
              {/* Agent display info */}
              <div className="flex items-center gap-3 bg-white/3 p-3 border border-white/5 clip-angular-sm">
                {selectedAgentForModal.displayIcon && (
                  <div className="relative size-12 rounded-sm overflow-hidden bg-black/40 flex-shrink-0">
                    <Image
                      src={selectedAgentForModal.displayIcon}
                      alt={selectedAgentForModal.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <span className="font-semibold text-white block">
                    {selectedAgentForModal.name}
                  </span>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">
                    {selectedAgentForModal.roleName}
                  </span>
                </div>
              </div>

              {/* Set Viability Tier section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Tier:
                </span>

                <div className="flex items-center justify-between gap-1 bg-black/30  p-2 sm:p-3 rounded-sm border border-white/5">
                  {["S", "A", "B", "C", "D"].map((tier) => {
                    const isCurrent =
                      (selectedAgentForModal.viability || "").toUpperCase() ===
                      tier;

                    return (
                      <button
                        key={tier}
                        onClick={() =>
                          handleUpdateViability(selectedAgentForModal, tier)
                        }
                        className={`relative flex size-10 sm:size-12 items-center aspect-square justify-center transition-all cursor-pointer select-none active:scale-95 filter ${
                          isCurrent
                            ? "scale-115 opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                            : "opacity-50 hover:opacity-100 hover:scale-105"
                        }`}
                        title={`${tier}-Tier`}
                      >
                        <Image
                          src={`/ranks/${tier.toLowerCase()}.png`}
                          alt={`${tier} Rank`}
                          fill
                          sizes="96px"
                          className="object-contain"
                        />
                      </button>
                    );
                  })}

                  {/* Clear tier button */}
                  <button
                    onClick={() =>
                      handleUpdateViability(selectedAgentForModal, null)
                    }
                    className={`relative flex size-10 sm:size-12 items-center aspect-square justify-center transition-all cursor-pointer select-none active:scale-95 filter ${
                      !selectedAgentForModal.viability
                        ? "scale-115 opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                        : "opacity-50 hover:opacity-100 hover:scale-105"
                    }`}
                    title="Remove Tier (Unranked)"
                  >
                    <div className="relative size-full">
                      <Image
                        src="/ranks/unranked.png"
                        alt="Unranked"
                        fill
                        sizes="96px"
                        className="object-contain"
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* Danger Zone / Deletion */}
              <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    const agentToDelete = selectedAgentForModal;
                    setSelectedAgentForModal(null);
                    await handleDeleteAgent(agentToDelete);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-sm bg-val-red/10 border border-val-red/20 text-val-red hover:bg-val-red hover:text-white hover:border-val-red transition-all cursor-pointer font-bold uppercase tracking-wider text-xs"
                >
                  <span>Remove Agent from Map</span>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </LazyMotion>
  );
}
