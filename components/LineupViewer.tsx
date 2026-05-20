"use client";

import { useState, useEffect, useTransition } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { urlFor } from "@/lib/sanity";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import ScreenshotLightbox from "./ScreenshotLightbox";
import { LayoutGrid, Plus, X, Loader2, Upload, Pencil, Trash2 } from "lucide-react";

interface LineupViewerProps {
  screenshots: Screenshot[];
  agent: Agent;
  map: GameMap;
}

// Helper to match screenshots to specific abilities by mapping slots, types, and keywords
function matchScreenshotToAbility(screenshot: Screenshot, ability: any, agentName: string): boolean {
  const title = (screenshot.title || "").toLowerCase();
  const abilityType = (screenshot.abilityType || "").toLowerCase();
  const abilityName = (ability.displayName || "").toLowerCase();
  const slot = (ability.slot || "").toLowerCase();

  // Ultimate slot check
  if (slot === "ultimate" || abilityName.includes("ultimate")) {
    return (
      abilityType === "ultimate" ||
      title.includes("ult") ||
      title.includes("ultimate") ||
      title.includes(abilityName)
    );
  }

  const agent = agentName.toLowerCase();

  if (agent === "killjoy") {
    if (abilityName.includes("nanoswarm") || slot === "grenade") {
      return (
        abilityType === "molly" ||
        title.includes("molly") ||
        title.includes("nanoswarm") ||
        title.includes("granade") ||
        title.includes("grenade") ||
        title.includes("swarm")
      );
    }
    if (abilityName.includes("turret") || slot === "ability2") {
      return title.includes("turret") || title.includes("turet");
    }
    if (abilityName.includes("alarmbot") || slot === "ability1") {
      return title.includes("alarm") || title.includes("bot");
    }
  }

  if (agent === "viper") {
    if (abilityName.includes("toxic screen") || slot === "ability2") {
      return (
        abilityType === "wall" ||
        title.includes("wall") ||
        title.includes("screen") ||
        title.includes("toxic screen")
      );
    }
    if (abilityName.includes("poison cloud") || slot === "ability1") {
      return (
        title.includes("cloud") ||
        title.includes("orb") ||
        title.includes("smoke") ||
        title.includes("poison") ||
        title.includes("cloud")
      );
    }
    if (abilityName.includes("snake bite") || slot === "grenade") {
      return title.includes("bite") || title.includes("snake") || title.includes("molly");
    }
  }

  // Generic keyword matching
  const keywords = abilityName.split(" ");
  for (const keyword of keywords) {
    if (keyword.length > 3 && title.includes(keyword)) {
      return true;
    }
  }

  return false;
}

const getSlotKey = (slot: string): string => {
  const s = slot.toLowerCase();
  if (s.includes("ability1")) return "Q";
  if (s.includes("ability2")) return "E";
  if (s.includes("grenade")) return "C";
  if (s.includes("ultimate")) return "X";
  if (s.includes("passive")) return "Passive";
  return slot;
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

export default function LineupViewer({
  screenshots,
  agent,
  map,
}: LineupViewerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [localScreenshots, setLocalScreenshots] = useState<Screenshot[]>(screenshots);
  useEffect(() => {
    setLocalScreenshots(screenshots);
  }, [screenshots]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedAbilityIdx, setSelectedAbilityIdx] = useState<number>(-1); // -1 means "All"
  const [selectedSide, setSelectedSide] = useState<"all" | "atk" | "def">("all");

  // Upload screenshot states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedAbilitySlot, setSelectedAbilitySlot] = useState("");
  const [title, setTitle] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit screenshot states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingScreenshot, setEditingScreenshot] = useState<Screenshot | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAbilitySlot, setEditAbilitySlot] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleEditClick = (screenshot: Screenshot) => {
    setEditingScreenshot(screenshot);
    setEditTitle(screenshot.title || "");
    setEditDescription(screenshot.description || "");
    
    // Reverse map abilityType (e.g. "smoke", "molly") to a slot if possible
    const matchingAbility = agent.abilities?.find(
      (a) => mapAbilityToGenericType(a.slot, a.displayName || "", a.description || "") === screenshot.abilityType
    );
    setEditAbilitySlot(matchingAbility?.slot || agent.abilities?.[0]?.slot || "");
    setEditImagePreview(
      screenshot._id.startsWith("optimistic-")
        ? (screenshot as any).tempPreview
        : (screenshot.image ? urlFor(screenshot.image).url() : null)
    );
    setEditImageFile(null);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScreenshot) return;
    if (!editTitle) {
      setEditError("Title is required.");
      return;
    }
    if (!editAbilitySlot) {
      setEditError("Ability is required.");
      return;
    }

    setIsEditing(true);
    setEditError(null);
    const oldScreenshots = [...localScreenshots];

    const selectedAbilityObj = agent.abilities?.find(
      (a) => a.slot === editAbilitySlot
    );
    const genericType = mapAbilityToGenericType(
      editAbilitySlot,
      selectedAbilityObj?.displayName || "",
      selectedAbilityObj?.description || ""
    );

    // Create optimistic updated screenshot
    const updatedScreenshots = localScreenshots.map((s) => {
      if (s._id === editingScreenshot._id) {
        const updated = {
          ...s,
          title: editTitle,
          description: editDescription,
          abilityType: genericType,
        };
        if (editImagePreview) {
          (updated as any).tempPreview = editImagePreview;
          updated._id = `optimistic-${Date.now()}`; // change ID so that image renderer uses tempPreview if we updated the image
        }
        return updated;
      }
      return s;
    });

    setLocalScreenshots(updatedScreenshots);
    setIsEditModalOpen(false);

    try {
      const formData = new FormData();
      formData.append("screenshotId", editingScreenshot._id);
      formData.append("title", editTitle);
      formData.append("description", editDescription);
      formData.append("abilityType", genericType);

      if (editImageFile) {
        formData.append("image", editImageFile);
      }

      const res = await fetch("/api/edit-screenshot", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to edit setup.");
      }

      setEditingScreenshot(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditTitle("");
      setEditDescription("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Error editing setup.");
      setLocalScreenshots(oldScreenshots); // Rollback
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    if (!confirm("Are you sure you want to delete this setup?")) return;

    const oldScreenshots = [...localScreenshots];
    setLocalScreenshots((prev) => prev.filter((s) => s._id !== screenshotId));

    try {
      const res = await fetch("/api/delete-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete setup");
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      alert(err.message || "An error occurred");
      setLocalScreenshots(oldScreenshots);
    }
  };

  // Pre-select first ability when component mounts or agent changes
  useEffect(() => {
    if (agent?.abilities && agent.abilities.length > 0) {
      setSelectedAbilitySlot(agent.abilities[0].slot);
    } else {
      setSelectedAbilitySlot("");
    }
  }, [agent]);

  // Lock body scroll when upload or edit modal is open
  useEffect(() => {
    if (isUploadModalOpen || isEditModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isUploadModalOpen, isEditModalOpen]);

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
      setUploadError("Please upload a screenshot.");
      return;
    }
    if (!selectedAbilitySlot) {
      setUploadError("Please select an ability.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    const oldScreenshots = [...localScreenshots];

    // Find the display name/description of the selected ability to do smart mapping
    const selectedAbilityObj = agent.abilities?.find(
      (a) => a.slot === selectedAbilitySlot
    );
    const genericType = mapAbilityToGenericType(
      selectedAbilitySlot,
      selectedAbilityObj?.displayName || "",
      selectedAbilityObj?.description || ""
    );

    const optimisticScreenshot: Screenshot = {
      _id: `optimistic-${Date.now()}`,
      title: title,
      description: descriptionText,
      abilityType: genericType,
      image: null,
    };
    (optimisticScreenshot as any).tempPreview = imagePreview;

    setLocalScreenshots((prev) => [...prev, optimisticScreenshot]);
    setIsUploadModalOpen(false);

    try {
      const formData = new FormData();
      formData.append("agentSlug", agent.slug?.current || agent._id);
      formData.append("mapSlug", map.slug?.current || map._id);
      formData.append("title", title);
      formData.append("description", descriptionText);
      formData.append("abilityType", genericType);
      formData.append("image", imageFile);

      const res = await fetch("/api/upload-screenshot", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload setup.");
      }

      setImageFile(null);
      setImagePreview(null);
      setTitle("");
      setDescriptionText("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Error uploading setup.");
      setLocalScreenshots(oldScreenshots);
    } finally {
      setIsUploading(false);
    }
  };

  const roleName = agent?.roleName ?? "";
  const roleIcon = agent?.roleIcon;
  const description = agent?.description || "";
  const abilities = agent?.abilities || [];
  const gradientColors = agent?.backgroundGradientColors || [];
  const accentColor = gradientColors[0]
    ? `#${gradientColors[0].slice(0, 6)}`
    : "#ff4655";

  const selectedAbility = selectedAbilityIdx !== -1 ? abilities[selectedAbilityIdx] : null;

  // Filter screenshots based on selected Side (ATK/DEF) and Ability Type
  const filteredScreenshots = localScreenshots.filter((screenshot) => {
    // 1. Filter by Side
    if (selectedSide !== "all") {
      const title = (screenshot.title || "").toLowerCase();
      const isAtk = title.includes("atk") || title.includes("attack");
      const isDef = title.includes("def") || title.includes("defense") || title.includes("retake");
      if (selectedSide === "atk" && !isAtk) return false;
      if (selectedSide === "def" && !isDef) return false;
    }

    // 2. Filter by Ability
    if (selectedAbilityIdx !== -1) {
      const ability = abilities[selectedAbilityIdx];
      if (!ability) return true;
      return matchScreenshotToAbility(screenshot, ability, agent?.name || "");
    }

    return true;
  });

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col">
        {/* Main content */}
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          {/* Left — Screenshots grid & side filters */}
          <div className="flex-1 min-w-0">
            {/* Side Tabs Selector */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                {(["all", "atk", "def"] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setSelectedSide(side)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all border ${
                      selectedSide === side
                        ? "border-val-red/30 bg-val-red/10 text-val-red"
                        : "border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {side === "all" ? "All" : side === "atk" ? "Attack" : "Defense"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-white/30 font-medium hidden sm:block">
                  Showing {filteredScreenshots.length} of {localScreenshots.length} setups
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white hover:bg-white/90 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-[1.02] cursor-pointer"
                >
                  <Plus size={14} className="stroke-[3]" />
                  Add Setup
                </button>
              </div>
            </div>

            {filteredScreenshots.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredScreenshots.map((screenshot, i) => (
                  <m.div
                    key={screenshot._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.25 }}
                  >
                    <div className="val-card group relative block w-full clip-angular bg-val-surface text-left">
                      <button
                        onClick={() => setLightboxIndex(i)}
                        className="block w-full text-left cursor-pointer"
                      >
                        <div className="relative aspect-video w-full bg-val-bg">
                          <Image
                            src={
                              screenshot._id.startsWith("optimistic-")
                                ? ((screenshot as any).tempPreview || "")
                                : urlFor(screenshot.image)
                                    .width(800)
                                    .height(450)
                                    .url()
                            }
                            alt={screenshot.title}
                            fill
                            className="object-contain transition-filter duration-75 group-hover:brightness-110"
                            sizes="(max-width: 640px) 200vw, (max-width: 1024px) 100vw, 66vw"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-white truncate pr-16">
                            {screenshot.title}
                          </p>
                        </div>
                      </button>

                      {/* Edit/Delete Overlay actions inside card */}
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(screenshot);
                          }}
                          className="flex size-7 items-center justify-center rounded-sm bg-white/10 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
                          title="Edit setup"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScreenshot(screenshot._id);
                          }}
                          className="flex size-7 items-center justify-center rounded-sm bg-white/10 hover:bg-val-red text-white hover:text-white transition-colors cursor-pointer"
                          title="Delete setup"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </m.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex size-16 items-center justify-center clip-diamond bg-white/4">
                  <span className="text-2xl text-white/20">?</span>
                </div>
                <p className="text-sm font-medium text-white/40">
                  No matching setups found.
                </p>
                <p className="mt-1 text-xs text-white/20">
                  Try changing your filters or adding screenshots.
                </p>
              </div>
            )}
          </div>

          {/* Right — Agent info panel */}
          <div className="w-full shrink-0 lg:w-80">
            <m.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Role */}
              <div className=" lg:pb-3 h-[42px] flex items-center gap-2">
                {roleIcon && (
                  <Image
                    src={roleIcon}
                    alt={roleName}
                    width={14}
                    height={14}
                    className="opacity-70"
                  />
                )}
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                  {roleName}
                </p>
              </div>

              {/* Name & Delete */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <h1
                  className="font-oswald text-5xl brightness-170 font-bold uppercase leading-none"
                  style={{
                    color: accentColor,
                    textShadow: `0 0 40px ${accentColor}30`,
                  }}
                >
                  {agent?.name}
                </h1>
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete the agent "${agent?.name}"? This will also delete all of their screenshots.`)) {
                      try {
                        const res = await fetch("/api/delete-agent", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ agentId: agent._id, mapId: map._id }),
                        });
                        if (!res.ok) {
                          const data = await res.json();
                          throw new Error(data.error || "Failed to delete agent");
                        }
                        router.push(map.slug?.current ? `/?map=${map.slug.current}` : "/");
                      } catch (err: any) {
                        alert(err.message || "An error occurred");
                      }
                    }
                  }}
                  className="flex size-8 items-center justify-center rounded-sm bg-white/5 border border-white/10 text-white/40 hover:border-val-red hover:bg-val-red/10 hover:text-val-red transition-colors cursor-pointer shrink-0"
                  title={`Delete agent ${agent?.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Description */}
              <p className="mb-5 text-sm leading-relaxed text-white/60 font-light">
                {description}
              </p>

              {/* Portrait */}
              {agent.displayIcon && (
                <div className="relative my-4 aspect-square w-42 overflow-hidden">
                  <Image
                    src={agent.displayIcon}
                    alt={agent?.name}
                    fill
                    sizes="336px"
                    className="object-cover object-center"
                    style={{
                      filter: `drop-shadow(0 20px 40px ${accentColor}40)`,
                    }}
                    priority
                  />
                </div>
              )}

              {/* Abilities */}
              <div className="mt-2">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Abilities Filter:
                </p>
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {/* All Abilities Button */}
                  <button
                    onClick={() => setSelectedAbilityIdx(-1)}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-all ${
                      selectedAbilityIdx === -1
                        ? ""
                        : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:opacity-100"
                    }`}
                    style={
                      selectedAbilityIdx === -1
                        ? {
                            borderColor: `${accentColor}50`,
                            backgroundColor: `${accentColor}15`,
                            color: accentColor,
                          }
                        : {}
                    }
                    title="Show all abilities"
                  >
                    <LayoutGrid size={16} />
                    {selectedAbilityIdx === -1 && (
                      <div
                        className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </button>

                  {abilities.map(
                    (ability, idx) =>
                      ability.displayIcon && (
                        <button
                          key={ability.slot || idx}
                          onClick={() => setSelectedAbilityIdx(idx)}
                          className={`relative flex h-9 w-9 items-center justify-center rounded-sm border transition-all ${
                            idx === selectedAbilityIdx
                              ? ""
                              : "border-white/10 bg-white/5 opacity-60 hover:opacity-100"
                          }`}
                          style={
                            idx === selectedAbilityIdx
                              ? {
                                  borderColor: `${accentColor}50`,
                                  backgroundColor: `${accentColor}15`,
                                }
                              : {}
                          }
                          title={ability.displayName}
                        >
                          <Image
                            src={ability.displayIcon}
                            alt={ability.displayName}
                            width={22}
                            height={22}
                            className="object-contain"
                          />
                          {idx === selectedAbilityIdx && (
                            <div
                              className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                              style={{ backgroundColor: accentColor }}
                            />
                          )}
                        </button>
                      ),
                  )}
                </div>
                {selectedAbility ? (
                  <div>
                    <p
                      className="mb-1 text-xs font-bold uppercase tracking-wider"
                      style={{ color: accentColor }}
                    >
                      {selectedAbility.displayName}
                    </p>
                    <p className="text-xs leading-relaxed text-white/40">
                      {selectedAbility.description}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p
                      className="mb-1 text-xs font-bold uppercase tracking-wider"
                      style={{ color: accentColor }}
                    >
                      All Setups
                    </p>
                    <p className="text-xs leading-relaxed text-white/40">
                      Showing setups for all abilities. Select an icon above to filter.
                    </p>
                  </div>
                )}
              </div>
            </m.div>
          </div>
        </div>

        <ScreenshotLightbox
          screenshots={filteredScreenshots}
          currentIndex={lightboxIndex ?? 0}
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          onNext={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev + 1) % filteredScreenshots.length : 0,
            )
          }
          onPrev={() =>
            setLightboxIndex((prev) =>
              prev !== null
                ? (prev - 1 + filteredScreenshots.length) % filteredScreenshots.length
                : 0,
            )
          }
        />

        {/* Upload Screenshot Modal */}
        {isUploadModalOpen && (
          <div onClick={() => { setIsUploadModalOpen(false); setImageFile(null); setImagePreview(null); setUploadError(null); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto cursor-pointer" data-lenis-prevent>
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg bg-val-surface border border-white/10 clip-angular my-8 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wider text-white">
                    Add {agent?.name} Lineup
                  </h3>
                  
                </div>
                <button
                  type="button"
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

              <form onSubmit={handleUploadSubmit} className="p-4 flex flex-col gap-4">
                {uploadError && (
                  <div className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2 rounded-sm">
                    {uploadError}
                  </div>
                )}

                {/* Ability Selector Grid */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Ability
                  </label>
                  {abilities && abilities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {abilities.map((ability) => {
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
                      No abilities found for this agent.
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
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
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
                    className="px-6 h-10 rounded-sm bg-val-red hover:bg-val-red-hover text-white text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
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

        {/* Edit Screenshot Modal */}
        {isEditModalOpen && editingScreenshot && (
          <div onClick={() => { setIsEditModalOpen(false); setEditingScreenshot(null); setEditImageFile(null); setEditImagePreview(null); setEditError(null); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto cursor-pointer" data-lenis-prevent>
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg bg-val-surface border border-white/10 clip-angular my-8 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div>
                  <h3 className="font-oswald text-lg font-bold uppercase tracking-wider text-white">
                    Edit Setup
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingScreenshot(null);
                    setEditImageFile(null);
                    setEditImagePreview(null);
                    setEditError(null);
                  }}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-4 flex flex-col gap-4">
                {editError && (
                  <div className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2 rounded-sm">
                    {editError}
                  </div>
                )}

                {/* Ability Selector Grid */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Ability
                  </label>
                  {abilities && abilities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {abilities.map((ability) => {
                        const isSelected = editAbilitySlot === ability.slot;
                        const keyBind = getSlotKey(ability.slot);

                        return (
                          <button
                            key={ability.slot}
                            type="button"
                            onClick={() => setEditAbilitySlot(ability.slot)}
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
                      No abilities found for this agent.
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
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
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
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white resize-none"
                  />
                </div>

                {/* Image Upload Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Screenshot (Optional - leave blank to keep current)
                  </label>
                  {editImagePreview ? (
                    <div className="relative aspect-video w-full rounded-sm overflow-hidden border border-white/10 group bg-black/40">
                      <Image
                        src={editImagePreview}
                        alt="Preview"
                        fill
                        sizes="(max-width: 480px) 100vw, 450px"
                        className="object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditImageFile(null);
                          // Revert preview to original image or empty
                          setEditImagePreview(editingScreenshot.image ? urlFor(editingScreenshot.image).url() : null);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-val-red text-white transition-colors cursor-pointer"
                        title="Remove chosen file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-video border border-dashed border-white/15 rounded-sm hover:border-val-red/40 hover:bg-white/1 cursor-pointer transition-all">
                      <div className="flex flex-col items-center gap-1 text-white/40">
                        <Upload className="size-8 mb-1" />
                        <span className="text-sm font-medium">Click to upload new screenshot</span>
                        <span className="text-[10px] text-white/30">PNG, JPG, WebP up to 10MB</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    disabled={isEditing}
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingScreenshot(null);
                      setEditImageFile(null);
                      setEditImagePreview(null);
                      setEditError(null);
                    }}
                    className="px-4 h-10 rounded-sm hover:bg-white/5 text-sm text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="px-6 h-10 rounded-sm bg-val-red hover:bg-val-red-hover text-white text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </div>
    </LazyMotion>
  );
}
