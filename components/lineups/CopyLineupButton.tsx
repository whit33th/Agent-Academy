"use client";
import { useCollectionActions } from "@/lib/collection/useCollectionActions";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
type CopyState = "idle" | "pending" | "done";
const LABELS: Record<CopyState, string> = {
  idle: "Add",
  pending: "Adding…",
  done: "Added",
};
export default function CopyLineupButton({
  id,
  mapSlug,
  agentSlug,
}: {
  id: Id<"lineups">;
  mapSlug: string;
  agentSlug: string;
}) {
  const { forkPublicLineup } = useCollectionActions();
  const [state, setState] = useState<CopyState>("idle");
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        disabled={state !== "idle"}
        onClick={async () => {
          setState("pending");
          const result = await forkPublicLineup(id, mapSlug, agentSlug);
          setState(result.ok ? "done" : "idle");
          setError(result.ok ? "" : result.error);
        }}
        className="shrink-0 clip-angular-sm bg-val-red px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-val-red/90 transition-colors cursor-pointer"
      >
        {LABELS[state]}
      </button>
      {error && (
        <p role="alert" className="text-xs text-val-red mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
