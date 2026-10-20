"use client";

import {
  useConvexConnectionState,
  useConvexAuth,
  useMutation,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAppSession } from "@/components/auth/SessionProvider";
import { normalizeName } from "@/lib/utils/normalize";
import type { ActionResult } from "@/lib/types";
import type { ViabilityTier } from "@/lib/utils/viability";
import type { LineupDraft } from "@/lib/lineups/commands";
import { validateLineupSelection } from "@/lib/catalog/lineup-options";
import { setGuestMap, setGuestAgent } from "./guest-selection";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function useCollectionActions() {
  const { getToken, signedIn } = useAppSession();
  const { isAuthenticated } = useConvexAuth();
  const connection = useConvexConnectionState();
  const setMapPreference = useMutation(
    api.maps.setPreference,
  ).withOptimisticUpdate((store, args) => {
    const rows = store.getQuery(api.maps.preferences, {});
    if (rows)
      store.setQuery(api.maps.preferences, {}, [
        ...rows.filter((row) => row.mapSlug !== args.mapSlug),
        args,
      ]);
  });
  const setRoster = useMutation(api.mapRoster.upsert).withOptimisticUpdate(
    (store, args) => {
      const rows = store.getQuery(api.mapRoster.listByMap, {
        mapSlug: args.mapSlug,
      });
      if (rows)
        store.setQuery(
          api.mapRoster.listByMap,
          { mapSlug: args.mapSlug },
          rows.map((row) =>
            row.agentSlug === args.agentSlug ? { ...row, ...args } : row,
          ),
        );
    },
  );
  const create = useMutation(api.lineups.create);
  const update = useMutation(api.lineups.update);
  const remove = useMutation(api.lineups.remove);
  const fork = useMutation(api.lineups.forkPublic);
  const discard = useMutation(api.uploads.discard);

  async function run<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
    try {
      if (!isAuthenticated) throw new Error("Sign in with Google first.");
      if (!connection.isWebSocketConnected || !navigator.onLine)
        throw new Error("Reconnect to the internet before making changes.");
      return { ok: true, data: await operation() };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "The change could not be saved.",
      };
    }
  }

  async function selectionChange<T>(
    cloud: () => Promise<T>,
    local: () => T,
  ): Promise<ActionResult<T>> {
    if (signedIn) return run(cloud);
    try {
      return { ok: true, data: local() };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Your selection could not be saved on this device.",
      };
    }
  }

  async function uploadImage(file: File): Promise<Id<"_storage">> {
    if (
      !IMAGE_TYPES.has(file.type) ||
      file.size <= 0 ||
      file.size > MAX_IMAGE_BYTES
    )
      throw new Error("Use a PNG, JPEG or WebP up to 10 MB.");
    const base =
      process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
      process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
        /\.convex\.cloud\/?$/,
        ".convex.site",
      );
    if (!base) throw new Error("Image storage is not configured.");
    const token = await getToken();
    if (!token) throw new Error("Your session expired. Sign in again.");
    const response = await fetch(`${base}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": file.type },
      body: file,
      signal: AbortSignal.timeout(30000),
    });
    const result: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !result ||
      typeof result !== "object" ||
      !("storageId" in result) ||
      typeof result.storageId !== "string" ||
      !result.storageId
    )
      throw new Error(
        result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "The image could not be uploaded.",
      );
    // HTTP is the untyped transport boundary. Convex validates this opaque ID on use.
    return result.storageId as Id<"_storage">;
  }

  return {
    addMap: (name: string) =>
      selectionChange(
        async () => {
          const slug = normalizeName(name);
          await setMapPreference({ mapSlug: slug, hidden: false });
          return { _id: slug };
        },
        () => {
          const slug = normalizeName(name);
          setGuestMap({ mapSlug: slug, hidden: false });
          return { _id: slug };
        },
      ),
    deleteMap: (mapSlug: string) =>
      selectionChange(
        async () => {
          await setMapPreference({ mapSlug, hidden: true });
        },
        () => setGuestMap({ mapSlug, hidden: true }),
      ),
    addAgent: (name: string, mapSlug: string | null | undefined) =>
      selectionChange(
        async () => {
          if (!mapSlug) throw new Error("Choose a map.");
          const agentSlug = normalizeName(name);
          await setRoster({ mapSlug, agentSlug, hidden: false });
          return { agentId: agentSlug };
        },
        () => {
          if (!mapSlug) throw new Error("Choose a map.");
          const agentSlug = normalizeName(name);
          setGuestAgent({ mapSlug, agentSlug, hidden: false });
          return { agentId: agentSlug };
        },
      ),
    deleteAgent: (agentSlug: string, mapSlug: string) =>
      selectionChange(
        async () => {
          await setRoster({ mapSlug, agentSlug, hidden: true });
        },
        () => setGuestAgent({ mapSlug, agentSlug, hidden: true }),
      ),
    updateAgentViability: (
      agentSlug: string,
      mapSlug: string,
      viability: ViabilityTier | null,
    ) =>
      selectionChange(
        async () => {
          await setRoster({ mapSlug, agentSlug, viability: viability ?? "" });
        },
        () => setGuestAgent({ mapSlug, agentSlug, viability: viability ?? "" }),
      ),
    forkPublicLineup: (
      sourceId: Id<"lineups">,
      mapSlug: string,
      agentSlug: string,
    ) => run(() => fork({ sourceId, mapSlug, agentSlug })),
    uploadScreenshot: (draft: LineupDraft, file: File) =>
      run(async () => {
        validateLineupSelection(draft.mapSlug, draft.agentSlug, draft.metadata);
        const storageId = await uploadImage(file);
        try {
          const result = await create({
            ...draft,
            abilityType: "other",
            storageId,
          });
          return { screenshotId: result.id };
        } catch (error) {
          await discard({ storageId }).catch(() => undefined);
          throw error;
        }
      }),
    editScreenshot: (id: Id<"lineups">, draft: LineupDraft, file?: File) =>
      run(async () => {
        validateLineupSelection(draft.mapSlug, draft.agentSlug, draft.metadata);
        const storageId =
          file instanceof File && file.size
            ? await uploadImage(file)
            : undefined;
        try {
          await update({
            id,
            title: draft.title,
            description: draft.description,
            isPublic: draft.isPublic,
            metadata: draft.metadata,
            ...(storageId ? { storageId } : {}),
          });
        } catch (error) {
          if (storageId) await discard({ storageId }).catch(() => undefined);
          throw error;
        }
      }),
    deleteScreenshot: (id: Id<"lineups">) =>
      run(async () => {
        await remove({ id });
      }),
  };
}
