"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { useCollectionActions } from "@/lib/collection/useCollectionActions";
import {
  EMPTY_METADATA,
  SIDE_LABELS,
  SITE_LABELS,
  LINEUP_SIDES,
  type LineupAbility,
  type LineupSide,
  type LineupSite,
} from "@/lib/lineups/metadata";
import {
  getPlantSites,
  isMapSlug,
  isAgentSlug,
} from "@/lib/catalog/lineup-options";
import type { LineupDraft } from "@/lib/lineups/commands";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import AbilityPickerGrid from "./AbilityPickerGrid";
import LineupImageInput from "./LineupImageInput";
interface Props {
  agent: Agent;
  map: GameMap;
  screenshot?: Screenshot;
  onClose: () => void;
}
export default function LineupEditorDialog(props: Props) {
  return (
    <LineupForm key={props.screenshot?._id ?? props.agent._id} {...props} />
  );
}
function LineupForm({ agent, map, screenshot, onClose }: Props) {
  const { uploadScreenshot, editScreenshot } = useCollectionActions();
  const [pending, startTransition] = useTransition();
  const abilities = agent.abilities;
  const originalMetadata = screenshot?.metadata ?? EMPTY_METADATA;
  const [slot, setSlot] = useState<LineupAbility>(originalMetadata.abilitySlot);
  const [side, setSide] = useState<LineupSide>(originalMetadata.side);
  const sites = getPlantSites(map._id);
  const [site, setSite] = useState<LineupSite>(
    screenshot ? originalMetadata.site : sites.length ? "unspecified" : "none",
  );
  const [title, setTitle] = useState(screenshot?.title ?? "");
  const [description, setDescription] = useState(screenshot?.description ?? "");
  const [isPublic, setIsPublic] = useState(Boolean(screenshot?.isPublic));
  const [preview, setPreview] = useState<string | null>(
    screenshot?.image ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const onFile = (file: File) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("Use a PNG, JPEG or WebP up to 10 MB.");
      return;
    }
    fileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setError(null);
  };
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const file = fileRef.current;
    if (!file && !screenshot) return setError("Please upload a screenshot.");
    if (!title.trim()) return setError("Title is required.");
    if (
      !screenshot &&
      (slot === "unspecified" ||
        side === "unspecified" ||
        site === "unspecified")
    )
      return setError(
        "Choose an ability, side and site (or General / no site).",
      );
    const agentSlug = agent.slug?.current;
    if (!isMapSlug(map._id) || !agentSlug || !isAgentSlug(agentSlug))
      return setError("Choose a known map and agent.");
    const draft: LineupDraft = {
      mapSlug: map._id,
      agentSlug,
      title: title.trim(),
      description,
      isPublic,
      metadata: { side, site, abilitySlot: slot },
    };
    setError(null);
    startTransition(async () => {
      const result = screenshot
        ? await editScreenshot(screenshot._id, draft, file ?? undefined)
        : file
          ? await uploadScreenshot(draft, file)
          : { ok: false as const, error: "Choose an image." };
      if (!result.ok) setError(result.error);
      else onClose();
    });
  };
  return (
    <Modal
      open
      onClose={() => {
        onClose();
      }}
      labelledBy="lineup-editor-title"
      className="w-full max-w-lg bg-val-surface border border-white/10 clip-angular my-8 cursor-default"
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <h3
          id="lineup-editor-title"
          className="font-oswald text-lg font-bold uppercase tracking-wider text-white"
        >
          {screenshot ? "Edit Setup" : "Add " + agent.name + " Lineup"}
        </h3>
        <button
          type="button"
          onClick={() => {
            onClose();
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
          {screenshot && (
            <button
              type="button"
              onClick={() => setSlot("unspecified")}
              aria-pressed={slot === "unspecified"}
              className="self-start text-xs text-white/60 underline"
            >
              Ability not specified
            </button>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-white/60">
            Side
            <SelectField<LineupSide>
              label="Setup side"
              value={side}
              onChange={setSide}
              options={LINEUP_SIDES.map((value) => ({
                value,
                label:
                  value === "unspecified" && !screenshot
                    ? "Choose side"
                    : SIDE_LABELS[value],
              }))}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-white/60">
            Site
            <SelectField<LineupSite>
              label="Setup site"
              value={site}
              onChange={setSite}
              options={[
                {
                  value: "unspecified",
                  label: screenshot ? "Not specified" : "Choose site",
                },
                ...sites.map((value) => ({ value, label: SITE_LABELS[value] })),
                { value: "none", label: SITE_LABELS.none },
              ]}
            />
          </div>
        </div>
        {screenshot &&
          (!screenshot.metadata ||
            Object.values(originalMetadata).includes("unspecified")) && (
            <p className="text-xs text-white/45">
              This older setup has incomplete classification. Choose its details
              explicitly; its title is not used for filtering.
            </p>
          )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lineup-editor-title-field"
            className="text-xs font-semibold uppercase tracking-wider text-white/50"
          >
            Title
          </label>
          <input
            id="lineup-editor-title-field"
            type="text"
            placeholder="e.g. A Site Default Plant Molly"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={160}
            className="w-full h-10 px-3 rounded-sm bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-val-red text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lineup-editor-description"
            className="text-xs font-semibold uppercase tracking-wider text-white/50"
          >
            Description / Notes
          </label>
          <textarea
            id="lineup-editor-description"
            placeholder="Describe where to stand and where to aim..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={5000}
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
          <LineupImageInput
            preview={preview}
            required={!screenshot}
            onChange={onFile}
            onClear={() => {
              fileRef.current = null;
              setPreview(screenshot?.image ?? null);
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-3 mt-2 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
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
            {pending ? "Saving…" : screenshot ? "Save Changes" : "Add Setup"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
