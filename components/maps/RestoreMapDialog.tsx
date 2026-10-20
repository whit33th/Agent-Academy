"use client";
import { useCollectionActions } from "@/lib/collection/useCollectionActions";

import { startTransition, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { audio } from "@/lib/audio";
import type { GameMap } from "@/lib/types";
import MapCardVisual from "./MapCardVisual";

interface RestoreMapDialogProps {
  open: boolean;
  unaddedMaps: GameMap[];
  onClose: () => void;
}

export default function RestoreMapDialog({
  open,
  unaddedMaps,
  onClose,
}: RestoreMapDialogProps) {
  const { addMap } = useCollectionActions();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = unaddedMaps.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );

  const handleAdd = (map: GameMap) => {
    audio.playClick();
    setError(null);
    startTransition(async () => {
      const result = await addMap(map.name);
      if (!result.ok) setError(result.error);
      else onClose();
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
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="add-map-search"
            className="text-xs font-semibold uppercase tracking-wider text-white/50"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
            <input
              id="add-map-search"
              type="text"
              placeholder="Search maps..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-sm bg-white/5 text-sm border border-white/10 focus:outline-none focus:border-val-red text-white"
            />
          </div>
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
                return (
                  <button
                    key={map._id}
                    type="button"
                    aria-label={`Add ${map.name}`}
                    onClick={() => handleAdd(map)}
                    onMouseEnter={() => audio.playHover()}
                    className="map-select-card group relative block w-full cursor-pointer bg-val-surface text-left focus-visible:outline focus-visible:outline-val-red"
                  >
                    <MapCardVisual map={map} />
                    <span className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-sm bg-black/60 border border-white/10 group-hover:border-val-teal/30 group-hover:bg-val-teal/20 text-white/60 group-hover:text-val-teal transition-colors">
                      <Plus size={16} />
                    </span>
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
