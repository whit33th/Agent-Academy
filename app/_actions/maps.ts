"use server";

import { revalidateTag } from "next/cache";
import { client } from "@/lib/sanity";
import { TAGS } from "@/lib/cache-tags";
import { toSlug } from "@/lib/utils/normalize";
import type { ActionResult } from "@/lib/types";

export async function addMap(
  mapName: string,
): Promise<ActionResult<{ _id: string }>> {
  if (!mapName) return { ok: false, error: "Map name is required" };
  const slug = toSlug(mapName);
  try {
    const existing = await client.fetch<{ _id: string } | null>(
      `*[_type == "map" && (name == $name || slug.current == $slug)][0]{_id}`,
      { name: mapName, slug },
    );
    if (existing) return { ok: false, error: "Map already exists" };

    const newMap = await client.create({
      _type: "map",
      name: mapName,
      slug: { _type: "slug", current: slug },
    });

    revalidateTag(TAGS.maps, { expire: 0 });
    return { ok: true, data: { _id: newMap._id } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteMap(mapId: string): Promise<ActionResult> {
  if (!mapId) return { ok: false, error: "Map id is required" };
  try {
    const [screenshots, metas] = await Promise.all([
      client.fetch<string[]>(
        `*[_type == "screenshot" && map._ref == $mapId]._id`,
        { mapId },
      ),
      client.fetch<string[]>(
        `*[_type == "mapAgentMeta" && map._ref == $mapId]._id`,
        { mapId },
      ),
    ]);

    const tx = client.transaction();
    screenshots.forEach((id) => tx.delete(id));
    metas.forEach((id) => tx.delete(id));
    tx.delete(mapId);
    await tx.commit();

    revalidateTag(TAGS.maps, { expire: 0 });
    revalidateTag(TAGS.agentsByMap(mapId), { expire: 0 });
    revalidateTag(TAGS.agentRefsByMap(mapId), { expire: 0 });
    revalidateTag(TAGS.screenshotsAll, { expire: 0 });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Server error";
}
