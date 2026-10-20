"use client";
import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import type { Agent, GameMap, Screenshot } from "@/lib/types";
import KeyboardShortcutsDialog from "./KeyboardShortcutsDialog";
const LineupLightbox = dynamic(() => import("./LineupLightbox"));
const LineupEditorDialog = dynamic(() => import("./LineupEditorDialog"));
const LineupActionsDialog = dynamic(() => import("./LineupActionsDialog"));

export default function LineupDialogs({
  filtered,
  lightboxIndex,
  setLightboxIndex,
  hotkeysOpen,
  setHotkeysOpen,
  isUploadOpen,
  setUploadOpen,
  agent,
  map,
  editTarget,
  setEditTarget,
  actionsTarget,
  setActionsTarget,
}: {
  filtered: Screenshot[];
  lightboxIndex: number | null;
  setLightboxIndex: Dispatch<SetStateAction<number | null>>;
  hotkeysOpen: boolean;
  setHotkeysOpen: (open: boolean) => void;
  isUploadOpen: boolean;
  setUploadOpen: (open: boolean) => void;
  agent: Agent;
  map: GameMap;
  editTarget: Screenshot | null;
  setEditTarget: (screenshot: Screenshot | null) => void;
  actionsTarget: Screenshot | null;
  setActionsTarget: (screenshot: Screenshot | null) => void;
}) {
  return (
    <>
      {lightboxIndex !== null && filtered.length > 0 && (
        <LineupLightbox
          screenshots={filtered}
          currentIndex={Math.min(lightboxIndex, filtered.length - 1)}
          isOpen
          onClose={() => setLightboxIndex(null)}
          onNext={() =>
            setLightboxIndex((index) => ((index ?? 0) + 1) % filtered.length)
          }
          onPrev={() =>
            setLightboxIndex(
              (index) => ((index ?? 0) - 1 + filtered.length) % filtered.length,
            )
          }
        />
      )}
      <KeyboardShortcutsDialog
        open={hotkeysOpen}
        onClose={() => setHotkeysOpen(false)}
      />
      {isUploadOpen && (
        <LineupEditorDialog
          agent={agent}
          map={map}
          onClose={() => setUploadOpen(false)}
        />
      )}
      {editTarget && (
        <LineupEditorDialog
          agent={agent}
          map={map}
          screenshot={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {actionsTarget && (
        <LineupActionsDialog
          screenshot={actionsTarget}
          onClose={() => setActionsTarget(null)}
          onEdit={(screenshot) => {
            setActionsTarget(null);
            setEditTarget(screenshot);
          }}
        />
      )}
    </>
  );
}
