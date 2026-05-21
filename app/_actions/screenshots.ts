"use server";

import { revalidateTag } from "next/cache";
import { client } from "@/lib/sanity";
import { TAGS } from "@/lib/cache-tags";
import type { ActionResult } from "@/lib/types";

interface UploadResult {
  screenshotId: string;
}

/** Upload a new screenshot. Resolves/creates map+agent docs as needed. */
export async function uploadScreenshot(
  formData: FormData,
): Promise<ActionResult<UploadResult>> {
  try {
    const mapSlug = String(formData.get("mapSlug") ?? "");
    const mapName = String(formData.get("mapName") ?? "");
    const agentSlug = String(formData.get("agentSlug") ?? "");
    const agentName = String(formData.get("agentName") ?? "");
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const abilityType = String(formData.get("abilityType") ?? "");
    const imageFile = formData.get("image");

    if (
      !mapSlug ||
      !agentSlug ||
      !title ||
      !abilityType ||
      !(imageFile instanceof File)
    ) {
      return {
        ok: false,
        error:
          "Missing required fields (mapSlug, agentSlug, title, abilityType, image)",
      };
    }

    let mapDoc = await client.fetch<{ _id: string } | null>(
      `*[_type == "map" && slug.current == $slug][0]{_id}`,
      { slug: mapSlug },
    );
    if (!mapDoc) {
      mapDoc = await client.create({
        _type: "map",
        name: mapName || titleCase(mapSlug),
        slug: { _type: "slug", current: mapSlug },
      });
      revalidateTag(TAGS.maps, { expire: 0 });
    }

    let agentDoc = await client.fetch<{ _id: string } | null>(
      `*[_type == "agent" && slug.current == $slug][0]{_id}`,
      { slug: agentSlug },
    );
    if (!agentDoc) {
      agentDoc = await client.create({
        _type: "agent",
        name: agentName || titleCase(agentSlug),
        slug: { _type: "slug", current: agentSlug },
      });
      revalidateTag(TAGS.agents, { expire: 0 });
    }

    const existingMeta = await client.fetch<{ _id: string } | null>(
      `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId][0]{_id}`,
      { mapId: mapDoc._id, agentId: agentDoc._id },
    );
    if (!existingMeta) {
      await client.create({
        _type: "mapAgentMeta",
        map: { _type: "reference", _ref: mapDoc._id },
        agent: { _type: "reference", _ref: agentDoc._id },
        viability: "a",
      });
      revalidateTag(TAGS.agentsByMap(mapDoc._id), { expire: 0 });
      revalidateTag(TAGS.agentRefsByMap(mapDoc._id), { expire: 0 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageAsset = await client.assets.upload("image", buffer, {
      filename: imageFile.name,
      contentType: imageFile.type,
    });

    const newScreenshot = await client.create({
      _type: "screenshot",
      title,
      description,
      abilityType,
      image: {
        _type: "image",
        asset: { _type: "reference", _ref: imageAsset._id },
      },
      map: { _type: "reference", _ref: mapDoc._id },
      agent: { _type: "reference", _ref: agentDoc._id },
    });

    revalidateTag(TAGS.screenshots(mapDoc._id, agentDoc._id), { expire: 0 });
    revalidateTag(TAGS.agentRefsByMap(mapDoc._id), { expire: 0 });
    revalidateTag(TAGS.agentsByMap(mapDoc._id), { expire: 0 });
    revalidateTag(TAGS.screenshotsAll, { expire: 0 });

    return { ok: true, data: { screenshotId: newScreenshot._id } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function editScreenshot(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const screenshotId = String(formData.get("screenshotId") ?? "");
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const abilityType = String(formData.get("abilityType") ?? "");
    const imageFile = formData.get("image");

    if (!screenshotId || !title || !abilityType) {
      return { ok: false, error: "Missing required fields" };
    }

    const patchData: Record<string, unknown> = {
      title,
      description,
      abilityType,
    };

    if (imageFile instanceof File && imageFile.size > 0) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const imageAsset = await client.assets.upload("image", buffer, {
        filename: imageFile.name,
        contentType: imageFile.type,
      });
      patchData.image = {
        _type: "image",
        asset: { _type: "reference", _ref: imageAsset._id },
      };
    }

    await client.patch(screenshotId).set(patchData).commit();

    revalidateTag(TAGS.screenshotsAll, { expire: 0 });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteScreenshot(
  screenshotId: string,
): Promise<ActionResult> {
  if (!screenshotId) return { ok: false, error: "screenshotId is required" };
  try {
    await client.delete(screenshotId);
    revalidateTag(TAGS.screenshotsAll, { expire: 0 });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

function titleCase(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Server error";
}
