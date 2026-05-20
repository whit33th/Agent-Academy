"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, X, Loader2, Trash2 } from "lucide-react";
import type { GameMap } from "@/lib/types";

interface MapGridProps {
  maps: GameMap[];
  agentCount: number;
  unaddedMaps?: any[];
}

export default function MapGrid({ maps, agentCount, unaddedMaps = [] }: MapGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [localMaps, setLocalMaps] = useState<GameMap[]>(maps);
  const [selectedMapForModal, setSelectedMapForModal] = useState<GameMap | null>(null);
  
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (map: GameMap) => (e: React.PointerEvent) => {
    // Only handle primary button (left click) or touch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    
    isLongPressActive.current = false;
    startCoordsRef.current = { x: e.clientX, y: e.clientY };
    
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setSelectedMapForModal(map);
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalMaps(maps);
  }, [maps]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const handleAddMap = async (mapName: string) => {
    setIsAdding(true);
    setError(null);
    const oldMaps = [...localMaps];

    // Find the unadded map info to show its splash/list image immediately
    const apiMap = unaddedMaps.find((m) => m.displayName === mapName);
    const optimisticMap: GameMap = {
      _id: `optimistic-${Date.now()}`,
      name: mapName,
      imageUrl: apiMap?.splash || apiMap?.listViewIcon || null,
      listViewIcon: apiMap?.listViewIcon || null,
      stylizedBackgroundImage: apiMap?.stylizedBackgroundImage || null,
      slug: {
        current: (mapName || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
      },
    };

    setLocalMaps((prev) => [...prev, optimisticMap]);
    setIsModalOpen(false);

    try {
      const res = await fetch("/api/add-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add map");
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
      setLocalMaps(oldMaps); // Rollback on error
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMap = async (map: GameMap) => {
    if (confirm(`Are you sure you want to delete the map "${map.name}"? This will also delete all of its screenshots.`)) {
      const oldMaps = [...localMaps];
      setLocalMaps((prev) => prev.filter((m) => m._id !== map._id));

      try {
        const res = await fetch("/api/delete-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mapId: map._id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to delete map");
        }
        startTransition(() => {
          router.refresh();
        });
      } catch (err: any) {
        alert(err.message || "An error occurred");
        setLocalMaps(oldMaps); // Rollback on error
      }
    }
  };

  const filteredMaps = unaddedMaps.filter((map) =>
    (map.displayName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* Map grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {localMaps.map((map, i: number) => {
            const slug = map.slug?.current ?? map._id;

            return (
              <m.div
                key={map.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
                className="group relative"
              >
                <Link
                  href={`/?map=${slug}`}
                  onPointerDown={handlePointerDown(map)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUpOrLeave}
                  onPointerCancel={handlePointerUpOrLeave}
                  onPointerLeave={handlePointerUpOrLeave}
                  onClick={handleCardClick}
                  onContextMenu={(e) => e.preventDefault()}
                  className="val-card group block clip-angular bg-val-surface text-left select-none touch-pan-y touch-callout-none"
                >
                  {map.imageUrl && (
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: "16/9" }}
                    >
                      <Image
                        src={map.imageUrl}
                        alt={map.name}
                        fill
                        className="object-cover transition-all duration-200 group-hover:scale-110 group-hover:brightness-110 pointer-events-none"
                        sizes="(max-width: 640px) 200vw, (max-width: 1024px) 100vw, 66vw"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                      {/* Red accent line at bottom */}
                      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-all duration-200 group-hover:w-full pointer-events-none" />

                      {/* Map name overlay */}
                      <div className="absolute inset-x-0 bottom-0 z-10 p-3 pointer-events-none">
                        <p className="font-oswald text-lg font-bold uppercase tracking-wide text-white">
                          {map.name}
                        </p>
                      </div>
                    </div>
                  )}
                </Link>
              </m.div>
            );
          })}

          {/* Add Map Card */}
          <m.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: maps.length * 0.02, duration: 0.25 }}
          >
            <button
              onClick={() => setIsModalOpen(true)}
              className="val-card group flex w-full clip-angular bg-val-surface border border-white/5 border-dashed cursor-pointer text-center relative"
              style={{ aspectRatio: "16/9" }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40 group-hover:text-val-red transition-colors">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/5 group-hover:bg-val-red/10 transition-colors">
                  <Plus size={24} />
                </div>
                <span className="font-oswald text-sm font-bold uppercase tracking-wider">
                  Add Map
                </span>
              </div>
              {/* Red accent line at bottom */}
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-all duration-200 group-hover:w-full" />
            </button>
          </m.div>
        </div>
      </m.div>

      {/* Modal */}
      {isModalOpen && (
        <div onClick={() => { setIsModalOpen(false); setSearchQuery(""); setError(null); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer">
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl overflow-hidden bg-val-surface border border-white/10 clip-angular cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-oswald text-xl font-bold uppercase text-white">
                Add Map from Valorant
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSearchQuery("");
                  setError(null);
                }}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search maps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-sm bg-white/5 text-sm border border-white/10 focus:outline-none focus:border-val-red text-white"
                />
              </div>

              {error && (
                <div className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2 rounded-sm">
                  {error}
                </div>
              )}

              {/* List of maps in grid */}
              <div className="max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar" data-lenis-prevent>
                {filteredMaps.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredMaps.map((map) => (
                      <button
                        key={map.uuid}
                        disabled={isAdding}
                        onClick={() => handleAddMap(map.displayName)}
                        className="group relative w-full clip-angular bg-black/40 border border-white/5 hover:border-val-red/30 transition-all cursor-pointer disabled:opacity-50 aspect-video overflow-hidden"
                      >
                        {/* Image */}
                        {(map.splash || map.listViewIcon) && (
                          <Image
                            src={map.splash || map.listViewIcon}
                            alt={map.displayName}
                            fill
                            className="object-cover transition-all duration-200 group-hover:scale-110 group-hover:brightness-110 pointer-events-none"
                            sizes="(max-width: 640px) 200vw, (max-width: 1024px) 100vw, 66vw"
                          />
                        )}
                        
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                        
                        {/* Red accent line at bottom */}
                        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-all duration-200 group-hover:w-full pointer-events-none" />

                        {/* Map info */}
                        <div className="absolute inset-x-0 bottom-0 z-10 p-3 pointer-events-none flex items-end justify-between">
                          <span className="font-oswald text-base font-bold uppercase tracking-wider text-white group-hover:text-val-red transition-colors">
                            {map.displayName}
                          </span>
                          
                          <div className="flex size-7 items-center justify-center rounded-sm bg-black/40 border border-white/10 group-hover:border-val-red/30 group-hover:bg-val-red/20 text-white/60 group-hover:text-val-red transition-all">
                            {isAdding ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Plus size={16} />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-sm text-white/40">
                    No unadded maps found
                  </div>
                )}
              </div>
            </div>
          </m.div>
        </div>
      )}

      {/* Map Actions Modal */}
      {selectedMapForModal && (
        <div onClick={() => setSelectedMapForModal(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer">
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-val-surface border border-white/10 clip-angular overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-oswald text-lg font-bold uppercase text-white truncate">
                Map Actions: {selectedMapForModal.name}
              </h3>
              <button
                onClick={() => setSelectedMapForModal(null)}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Actions list */}
            <div className="p-4 flex flex-col gap-2">
              <button
                onClick={async () => {
                  const mapToDelete = selectedMapForModal;
                  setSelectedMapForModal(null);
                  await handleDeleteMap(mapToDelete);
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-sm bg-val-red/10 border border-val-red/20 text-val-red hover:bg-val-red hover:text-white hover:border-val-red transition-all cursor-pointer font-bold uppercase tracking-wider text-xs"
              >
                <span>Delete Map</span>
                <Trash2 size={14} />
              </button>
            </div>
          </m.div>
        </div>
      )}
    </LazyMotion>
  );
}
