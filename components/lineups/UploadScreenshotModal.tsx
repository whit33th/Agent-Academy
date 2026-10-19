"use client";

import { useTransition, useRef, useState } from "react";
import { X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import AbilityPickerGrid from "./AbilityPickerGrid";
import ImageDropArea from "./ImageDropArea";
import { uploadScreenshot } from "@/app/_actions/screenshots";
import { useAppSession } from "@/components/auth/SessionProvider";
import { mapAbilityToGenericType } from "@/lib/utils/ability";
import type { Agent, GameMap, Screenshot } from "@/lib/types";

interface UploadScreenshotModalProps {
  open: boolean;
  agent: Agent;
  map: GameMap;
  onClose: () => void;
  applyOptimistic: (screenshot: Screenshot) => void;
}

export default function UploadScreenshotModal(props: UploadScreenshotModalProps) {
  if (!props.open) return null;
  return <UploadScreenshotForm key={props.agent._id} {...props} />;
}

function UploadScreenshotForm({
  agent,
  map,
  onClose,
  applyOptimistic,
}: UploadScreenshotModalProps) {
  const { getToken } = useAppSession();
  const [pending, startTransition] = useTransition();
  const abilities = agent.abilities;
  const [slot, setSlot] = useState(abilities[0]?.slot ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const fileRef = useRef<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    fileRef.current = null;
    setPreview(null);
    setTitle("");
    setDescription("");
    setIsPublic(false);
    setError(null);
  };

  const onFile = (f: File) => {
    fileRef.current = f;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current;
    if (!file) return setError("Please upload a screenshot.");
    if (!slot) return setError("Please select an ability.");

    const ability = abilities.find((a) => a.slot === slot);
    const abilityType = mapAbilityToGenericType(
      slot,
      ability?.displayName ?? "",
      ability?.description ?? "",
    );

    const optimistic: Screenshot = {
      _id: `optimistic-${Date.now()}`,
      title,
      description,
      abilityType,
      image: null,
      isPublic,
      tempPreview: preview ?? undefined,
    };

    const formData = new FormData();
    formData.set("agentSlug", agent.slug?.current ?? agent._id);
    formData.set("agentName", agent.name);
    formData.set("mapSlug", map.slug?.current ?? map._id);
    formData.set("mapName", map.name);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("abilityType", abilityType);
    formData.set("image", file);
    if (isPublic) formData.set("isPublic", "true");

    startTransition(async () => {
      const result = await uploadScreenshot(formData, await getToken());
      if (!result.ok) { setError(result.error); return; }
      applyOptimistic({ ...optimistic, _id: result.data.screenshotId });
      onClose();
      reset();
    });
  };

  return (
    <Modal
      open
      onClose={() => {
        onClose();
        reset();
      }}
      labelledBy="upload-title"
      className="w-full max-w-lg bg-val-surface border border-white/10 clip-angular my-8 cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="upload-title"
          className="font-oswald text-lg font-bold uppercase tracking-wider text-white"
        >
          Add {agent.name} Lineup
        </h3>
        <button
          type="button"
          onClick={() => {
            onClose();
            reset();
          }}
          aria-label="Close upload dialog"
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

        <fieldset className="flex flex-col gap-1.5 border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Ability
          </legend>
          <AbilityPickerGrid
            abilities={abilities}
            selectedSlot={slot}
            onSelect={setSlot}
          />
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="upload-title-field"
            className="text-xs font-semibold uppercase tracking-wider text-white/50"
          >
            Title
          </label>
          <input
            id="upload-title-field"
            type="text"
            placeholder="e.g. A Site Default Plant Molly"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="upload-desc-field"
            className="text-xs font-semibold uppercase tracking-wider text-white/50"
          >
            Description / Notes
          </label>
          <textarea
            id="upload-desc-field"
            placeholder="Describe where to stand and where to aim..."
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
            Screenshot
          </span>
          <ImageDropArea
            preview={preview}
            required
            onChange={onFile}
            onClear={() => {
              fileRef.current = null;
              setPreview(null);
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              reset();
            }}
            className="px-4 h-10 rounded-sm hover:bg-white/5 text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-6 h-10 rounded-sm bg-val-red hover:bg-val-red/90 text-white text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Share Setup
          </button>
        </div>
      </form>
    </Modal>
  );
}
