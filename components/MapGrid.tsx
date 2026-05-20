"use client";

import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Plus, Search, X, Loader2, Trash2 } from "lucide-react";
import type { GameMap } from "@/lib/types";

interface MapGridProps {
  maps: GameMap[];
  agentCount: number;
  unaddedMaps?: any[];
}

export default function MapGrid({ maps, agentCount, unaddedMaps = [] }: MapGridProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // Reload page to fetch updated maps
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setIsAdding(false);
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
          {maps.map((map, i: number) => {
            const slug = map.slug?.current ?? map._id;

            return (
              <m.div
                key={map._id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
                className="group relative"
              >
                <Link
                  href={`/?map=${slug}`}
                  className="val-card group block clip-angular bg-val-surface text-left"
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
                        className="object-cover transition-all duration-200 group-hover:scale-110 group-hover:brightness-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      {/* Red accent line at bottom */}
                      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-all duration-200 group-hover:w-full" />

                      {/* Map name overlay */}
                      <div className="absolute inset-x-0 bottom-0 z-10 p-3">
                        <p className="font-oswald text-lg font-bold uppercase tracking-wide text-white">
                          {map.name}
                        </p>
                      </div>
                    </div>
                  )}
                </Link>

                {/* Delete Map Button */}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete the map "${map.name}"? This will also delete all of its screenshots.`)) {
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
                        window.location.reload();
                      } catch (err: any) {
                        alert(err.message || "An error occurred");
                      }
                    }
                  }}
                  className="absolute top-2 right-2 z-20 flex size-8 items-center justify-center rounded-sm bg-black/60 hover:bg-val-red text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title={`Delete map ${map.name}`}
                >
                  <Trash2 size={14} />
                </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md overflow-hidden bg-val-surface border border-white/10 clip-angular"
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
            <div className="p-4 flex flex-col gap-4">
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

              {/* List of maps */}
              <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar" data-lenis-prevent>
                {filteredMaps.length > 0 ? (
                  filteredMaps.map((map) => (
                    <button
                      key={map.uuid}
                      disabled={isAdding}
                      onClick={() => handleAddMap(map.displayName)}
                      className="group flex items-center justify-between p-2 rounded-sm bg-white/3 hover:bg-val-red/10 border border-white/5 hover:border-val-red/30 text-left transition-all cursor-pointer disabled:opacity-50 w-full"
                    >
                      <div className="flex items-center gap-3">
                        {map.listViewIcon && (
                          <div className="relative size-12 rounded-sm overflow-hidden bg-black/40 flex-shrink-0">
                            <Image
                              src={map.listViewIcon}
                              alt={map.displayName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <span className="font-semibold text-white group-hover:text-val-red transition-colors">
                          {map.displayName}
                        </span>
                      </div>
                      <div className="flex size-7 items-center justify-center rounded-sm bg-white/5 group-hover:bg-val-red/20 text-white/60 group-hover:text-val-red transition-all">
                        {isAdding ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Plus size={16} />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-white/40">
                    No unadded maps found
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
