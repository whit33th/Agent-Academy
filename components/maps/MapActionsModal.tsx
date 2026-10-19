"use client";
import { useAppSession } from "@/components/auth/SessionProvider";

import { startTransition } from "react";
import { Trash2, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { GameMap } from "@/lib/types";
import { deleteMap } from "@/app/_actions/maps";

interface MapActionsModalProps {
  map: GameMap | null;
  onClose: () => void;
  applyOptimistic: (mapId: string) => void;
}

export default function MapActionsModal({
  map,
  onClose,
  applyOptimistic,
}: MapActionsModalProps) {
  const { getToken } = useAppSession();
  if (!map) return null;

  const handleDelete = () => {
    if (!confirm(`Hide "${map.name}" from your collection? Your setups will be kept.`))
      return;
    onClose();
    // Global startTransition keeps the action alive after the modal unmounts.
    startTransition(async () => {
      const result = await deleteMap(map._id, await getToken());
      if (!result.ok) alert(result.error);
      else applyOptimistic(map._id);
    });
  };

  return (
    <Modal
      open={!!map}
      onClose={onClose}
      labelledBy="map-actions-title"
      className="w-full max-w-sm bg-val-surface border border-white/10 clip-angular overflow-hidden cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="map-actions-title"
          className="font-oswald text-lg font-bold uppercase text-white truncate"
        >
          Map Actions: {map.name}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close map actions"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </header>
      <div className="p-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleDelete}
          className="w-full flex items-center justify-between px-4 py-3 rounded-sm bg-val-red/10 border border-val-red/20 text-val-red hover:bg-val-red hover:text-white hover:border-val-red transition-colors cursor-pointer font-bold uppercase tracking-wider text-xs"
        >
          <span>Delete Map</span>
          <Trash2 size={14} />
        </button>
      </div>
    </Modal>
  );
}
