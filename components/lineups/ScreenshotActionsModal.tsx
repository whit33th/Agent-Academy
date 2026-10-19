"use client";

import { startTransition } from "react";
import Image from "next/image";
import { Pencil, Trash2, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { deleteScreenshot } from "@/app/_actions/screenshots";
import { useAppSession } from "@/components/auth/SessionProvider";
import type { Screenshot } from "@/lib/types";

interface ScreenshotActionsModalProps {
  screenshot: Screenshot | null;
  onClose: () => void;
  onEdit: (s: Screenshot) => void;
  applyOptimisticDelete: (id: string) => void;
}

export default function ScreenshotActionsModal({
  screenshot,
  onClose,
  onEdit,
  applyOptimisticDelete,
}: ScreenshotActionsModalProps) {
  const { getToken } = useAppSession();
  if (!screenshot) return null;

  const src = screenshot.tempPreview
    ? screenshot.tempPreview
    : screenshot.image
      ? screenshot.image
      : "";

  const handleDelete = () => {
    if (!confirm("Delete this setup?")) return;
    onClose();
    startTransition(async () => {
      const result = await deleteScreenshot(screenshot._id, await getToken());
      if (!result.ok) alert(result.error);
      else applyOptimisticDelete(screenshot._id);
    });
  };

  return (
    <Modal
      open={!!screenshot}
      onClose={onClose}
      labelledBy="screenshot-actions-title"
      className="w-full max-w-sm bg-val-surface border border-white/10 clip-angular overflow-hidden cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="screenshot-actions-title"
          className="font-oswald text-lg font-bold uppercase text-white truncate"
        >
          Setup Actions
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close screenshot actions"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </header>

      <div className="p-4 flex flex-col gap-4">
        <figure className="relative aspect-video w-full rounded-sm overflow-hidden bg-black/40 border border-white/5">
          {src && (
            <Image
              src={src}
              alt={screenshot.title}
              fill
              className="object-contain"
              sizes="320px"
            />
          )}
        </figure>

        <div className="bg-white/3 p-3 border border-white/5 clip-angular-sm">
          <span className="font-semibold text-white block truncate">
            {screenshot.title}
          </span>
          {screenshot.description && (
            <p className="text-[11px] text-white/40 line-clamp-2 mt-1">
              {screenshot.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onEdit(screenshot);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-sm bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black transition-colors cursor-pointer font-bold uppercase tracking-wider text-xs"
          >
            <span>Edit Setup</span>
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-full flex items-center justify-between px-4 py-3 rounded-sm bg-val-red/10 border border-val-red/20 text-val-red hover:bg-val-red hover:text-white hover:border-val-red transition-colors cursor-pointer font-bold uppercase tracking-wider text-xs"
          >
            <span>Delete Setup</span>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
