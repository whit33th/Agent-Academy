"use client";

import { useTransition, useEffect, useState } from "react";
import { X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import AbilityPickerGrid from "./AbilityPickerGrid";
import ImageDropArea from "./ImageDropArea";
import { editScreenshot } from "@/app/_actions/screenshots";
import { useAppSession } from "@/components/auth/SessionProvider";
import { mapAbilityToGenericType } from "@/lib/utils/ability";
import type { Agent, Screenshot } from "@/lib/types";

interface EditScreenshotModalProps {
  screenshot: Screenshot | null;
  agent: Agent;
  onClose: () => void;
  applyOptimistic: (next: Screenshot) => void;
}

export default function EditScreenshotModal({
  screenshot,
  agent,
  onClose,
  applyOptimistic,
}: EditScreenshotModalProps) {
  const { getToken } = useAppSession();
  const [pending, startTransition] = useTransition();
  const abilities = agent.abilities;
  const [slot, setSlot] = useState(abilities[0]?.slot ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!screenshot) return;
    setTitle(screenshot.title ?? "");
    setDescription(screenshot.description ?? "");
    const matching = abilities.find(
      (a) =>
        mapAbilityToGenericType(
          a.slot,
          a.displayName ?? "",
          a.description ?? "",
        ) === screenshot.abilityType,
    );
    setSlot(matching?.slot ?? abilities[0]?.slot ?? "");
    setFile(null);
    setError(null);
    setIsPublic(Boolean(screenshot.isPublic));
    if (screenshot.tempPreview) {
      setPreview(screenshot.tempPreview);
    } else if (screenshot.image) {
      setPreview(screenshot.image);
    } else {
      setPreview(null);
    }
  }, [screenshot, abilities]);

  if (!screenshot) return null;

  const onFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return setError("Title is required.");
    if (!slot) return setError("Ability is required.");

    const ability = abilities.find((a) => a.slot === slot);
    const abilityType = mapAbilityToGenericType(
      slot,
      ability?.displayName ?? "",
      ability?.description ?? "",
    );

    const next: Screenshot = {
      ...screenshot,
      title,
      description,
      abilityType,
      isPublic,
      tempPreview: file ? (preview ?? undefined) : screenshot.tempPreview,
    };

    const formData = new FormData();
    formData.set("screenshotId", screenshot._id);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("abilityType", abilityType);
    if (file) formData.set("image", file);
    if (isPublic) formData.set("isPublic", "true");

    startTransition(async () => {
      const result = await editScreenshot(formData, await getToken());
      if (!result.ok) { setError(result.error); return; }
      applyOptimistic(next);
      onClose();
    });
  };

  return (
    <Modal
      open={!!screenshot}
      onClose={onClose}
      labelledBy="edit-title"
      className="w-full max-w-lg bg-val-surface border border-white/10 clip-angular my-8 cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="edit-title"
          className="font-oswald text-lg font-bold uppercase tracking-wider text-white"
        >
          Edit Setup
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close edit dialog"
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </header>

      <form onSubmit={onSubmit} className="p-4 flex flex-col gap-4">
        {error && (
          <p
            role="alert"
            className="text-xs text-val-red bg-val-red/10 border border-val-red/20 p-2 rounded-sm"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Ability
          </label>
          <AbilityPickerGrid
            abilities={abilities}
            selectedSlot={slot}
            onSelect={setSlot}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-title-field"
            className="text-xs font-semibold uppercase tracking-wider text-white/50"
          >
            Title
          </label>
          <input
            id="edit-title-field"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-desc-field"
            className="text-xs font-semibold uppercase tracking-wider text-white/50"
          >
            Description / Notes
          </label>
          <textarea
            id="edit-desc-field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white resize-none"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-white/60 select-none">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="size-4 accent-val-red"
          />
          Public content (show in Feed)
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Screenshot (optional - leave blank to keep current)
          </span>
          <ImageDropArea
            preview={preview}
            onChange={onFile}
            onClear={() => {
              setFile(null);
              setPreview(
                screenshot.image ? screenshot.image : null,
              );
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 rounded-sm hover:bg-white/5 text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-6 h-10 rounded-sm bg-val-red hover:bg-val-red/90 text-white text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
