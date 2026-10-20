"use client";
import { useCollectionActions } from "@/lib/collection/useCollectionActions";

import { useTransition, useState } from "react";
import ConfirmAction from "@/components/ui/ConfirmAction";
import { Trash2, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { GameMap } from "@/lib/types";

interface MapSettingsDialogProps {
  map: GameMap | null;
  onClose: () => void;
}

export default function MapSettingsDialog({
  map,
  onClose,
}: MapSettingsDialogProps) {
  const { deleteMap } = useCollectionActions();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!map) return null;

  const handleDelete = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await deleteMap(map._id);
      if (!result.ok) setError(result.error);
      else onClose();
    });
  };

  return (
    <Modal
      open={!!map}
      onClose={() => {
        if (!pending) {
          setConfirming(false);
          setError(null);
          onClose();
        }
      }}
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
          disabled={pending}
          aria-label="Close map actions"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </header>
      <div className="p-4 flex flex-col gap-2">
        {confirming ? (
          <ConfirmAction
            title={`Hide ${map.name}?`}
            description="The map will leave your collection. Your agents and saved setups will be kept, and you can add the map again anytime."
            label="Hide map"
            pending={pending}
            error={error}
            onConfirm={handleDelete}
            onCancel={() => {
              setConfirming(false);
              setError(null);
            }}
          />
        ) : (
          <>
            {error && (
              <p role="alert" className="text-sm text-val-red">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-sm bg-val-red/10 border border-val-red/20 text-val-red hover:bg-val-red hover:text-white hover:border-val-red transition-colors cursor-pointer font-bold uppercase tracking-wider text-xs"
            >
              <span>Hide Map</span>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
