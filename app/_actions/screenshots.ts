"use server";

import { updateTag } from "next/cache";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { authenticatedClient } from "@/lib/convex/authenticated-client";
import { TAGS } from "@/lib/cache-tags";
import { client } from "@/lib/sanity";
import type { ActionResult } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function fields(data: FormData) {
  return {
    title: String(data.get("title") ?? ""),
    description: String(data.get("description") ?? ""),
    abilityType: String(data.get("abilityType") ?? ""),
    isPublic: data.get("isPublic") === "true",
  };
}

function refreshLineups(mapSlug?: string, agentSlug?: string) {
  updateTag(TAGS.screenshotsAll);
  if (mapSlug && agentSlug) updateTag(TAGS.screenshots(mapSlug, agentSlug));
  if (mapSlug) updateTag(TAGS.screenshots(mapSlug, "counts"));
}

async function deleteSanityAsset(id?: string) {
  if (!id || !process.env.SANITY_API_TOKEN) return;
  await client.delete(id).catch(() => undefined);
}

async function uploadSanity(file: File) {
  if (!process.env.SANITY_API_TOKEN || !process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    throw new Error("Image storage is unavailable.");
  }
  if (!TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Use a PNG, JPEG or WebP up to 10 MB.");
  }
  const asset = await client.assets.upload("image", file, {
    filename: file.name || "lineup",
    contentType: file.type,
  });
  return { imageUrl: asset.url, imageAssetId: asset._id };
}

export async function uploadScreenshot(data: FormData, token: string | null): Promise<ActionResult<{ screenshotId: string }>> {
  let uploaded: { imageAssetId: string } | undefined;
  try {
    const convex = authenticatedClient(token);
    const file = data.get("image");
    if (!(file instanceof File)) throw new Error("Choose an image.");
    const image = await uploadSanity(file);
    uploaded = image;
    const mapSlug = String(data.get("mapSlug"));
    const agentSlug = String(data.get("agentSlug"));
    const result = await convex.mutation(api.lineups.create, { ...fields(data), mapSlug, agentSlug, imageUrl: image.imageUrl, imageAssetId: image.imageAssetId });
    refreshLineups(mapSlug, agentSlug);
    return { ok: true, data: { screenshotId: result.id } };
  } catch (error) {
    await deleteSanityAsset(uploaded?.imageAssetId);
    return { ok: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function editScreenshot(data: FormData, token: string | null): Promise<ActionResult> {
  let uploaded: { imageAssetId: string } | undefined;
  try {
    const convex = authenticatedClient(token);
    const file = data.get("image");
    const image = file instanceof File && file.size ? await uploadSanity(file) : undefined;
    uploaded = image;
    const result = await convex.mutation(api.lineups.update, {
      id: String(data.get("screenshotId")) as Id<"lineups">,
      ...fields(data),
      ...(image ? { imageUrl: image.imageUrl, imageAssetId: image.imageAssetId } : {}),
    });
    if (image) await deleteSanityAsset(result.releasedAssetId);
    refreshLineups(result.mapSlug, result.agentSlug);
    return { ok: true, data: undefined };
  } catch (error) {
    await deleteSanityAsset(uploaded?.imageAssetId);
    return { ok: false, error: error instanceof Error ? error.message : "Update failed" };
  }
}

export async function deleteScreenshot(id: string, token: string | null): Promise<ActionResult> {
  try {
    const result = await authenticatedClient(token).mutation(api.lineups.remove, { id: id as Id<"lineups"> });
    await deleteSanityAsset(result.releasedAssetId);
    refreshLineups(result.mapSlug, result.agentSlug);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Delete failed" };
  }
}
