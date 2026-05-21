"use client";

import { startTransition, useState } from "react";
import Image from "next/image";
import { Plus, Search, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { audio } from "@/lib/audio";
import { addMap } from "@/app/_actions/maps";
import type { ValorantMap } from "@/lib/valorant-api";

interface AddMapModalProps {
  open: boolean;
  unaddedMaps: ValorantMap[];
  onClose: () => void;
  /** Called inside the action transition to display the optimistic map. */
  applyOptimistic: (apiMap: ValorantMap) => void;
}

export default function AddMapModal({
  open,
  unaddedMaps,
  onClose,
  applyOptimistic,
}: AddMapModalProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = unaddedMaps.filter((m) =>
    (m.displayName ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  const handleAdd = (map: ValorantMap) => {
    audio.playClick();
    setError(null);
    onClose();
    startTransition(async () => {
      applyOptimistic(map);
      const result = await addMap(map.displayName);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setQuery("");
        setError(null);
      }}
      labelledBy="add-map-title"
      className="w-full max-w-4xl overflow-hidden bg-val-surface border border-white/10 clip-angular cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="add-map-title"
          className="font-oswald text-xl font-bold uppercase text-white"
        >
          Add Map
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close add-map dialog"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </header>

      <section className="p-5 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search maps..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-sm bg-white/5 text-sm border border-white/10 focus:outline-none focus:border-val-red text-white"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2 rounded-sm"
          >
            {error}
          </p>
        )}

        <div
          className="max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar"
          data-lenis-prevent
        >
          {filtered.length === 0 ? (
            <p className="text-center py-12 text-sm text-white/40">
              No unadded maps found
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((map) => {
                const src = map.splash || map.listViewIcon;
                return (
                  <button
                    key={map.uuid}
                    type="button"
                    onClick={() => handleAdd(map)}
                    onMouseEnter={() => audio.playHover()}
                    className="group relative w-full clip-angular bg-black/40 border border-white/5 hover:border-val-red/30 transition-[border-color,opacity] cursor-pointer disabled:opacity-50 aspect-video overflow-hidden"
                  >
                    {src && (
                      <Image
                        src={src}
                        alt={map.displayName}
                        fill
                        className="object-cover transition-[scale,filter] duration-200 group-hover:scale-110 group-hover:brightness-110 pointer-events-none"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-val-red transition-[width] duration-200 group-hover:w-full pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 z-10 p-3 pointer-events-none flex items-end justify-between">
                      <span className="font-oswald text-base font-bold uppercase tracking-wider text-white group-hover:text-val-red transition-colors">
                        {map.displayName}
                      </span>
                      <span className="flex size-7 items-center justify-center rounded-sm bg-black/40 border border-white/10 group-hover:border-val-red/30 group-hover:bg-val-red/20 text-white/60 group-hover:text-val-red transition-colors">
                        <Plus size={16} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Modal>
  );
}
