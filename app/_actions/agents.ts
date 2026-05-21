"use server";

import { revalidateTag } from "next/cache";
import { client } from "@/lib/sanity";
import { TAGS } from "@/lib/cache-tags";
import { toSlug } from "@/lib/utils/normalize";
import type { ActionResult } from "@/lib/types";

interface AddAgentResult {
  agentId: string;
}

export async function addAgent(
  agentName: string,
  mapSlug?: string | null,
): Promise<ActionResult<AddAgentResult>> {
  if (!agentName) return { ok: false, error: "Agent name is required" };
  const slug = toSlug(agentName);

  try {
    let agentDoc = await client.fetch<{ _id: string } | null>(
      `*[_type == "agent" && (name == $name || slug.current == $slug)][0]{_id}`,
      { name: agentName, slug },
    );

    if (!agentDoc) {
      agentDoc = await client.create({
        _type: "agent",
        name: agentName,
        slug: { _type: "slug", current: slug },
      });
      revalidateTag(TAGS.agents, { expire: 0 });
    }

    if (mapSlug && agentDoc) {
      const mapDoc = await client.fetch<{ _id: string } | null>(
        `*[_type == "map" && slug.current == $slug][0]{_id}`,
        { slug: mapSlug },
      );
      if (mapDoc) {
        const existingMeta = await client.fetch<{ _id: string } | null>(
          `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId][0]{_id}`,
          { mapId: mapDoc._id, agentId: agentDoc._id },
        );
        if (!existingMeta) {
          await client.create({
            _type: "mapAgentMeta",
            map: { _type: "reference", _ref: mapDoc._id },
            agent: { _type: "reference", _ref: agentDoc._id },
          });
        }
        revalidateTag(TAGS.agentsByMap(mapDoc._id), { expire: 0 });
        revalidateTag(TAGS.agentRefsByMap(mapDoc._id), { expire: 0 });
      }
    }

    return { ok: true, data: { agentId: agentDoc!._id } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteAgent(
  agentId: string,
  mapId?: string | null,
): Promise<ActionResult> {
  if (!agentId) return { ok: false, error: "Agent id is required" };
  try {
    const tx = client.transaction();

    if (mapId) {
      const [metas, screenshots] = await Promise.all([
        client.fetch<string[]>(
          `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId]._id`,
          { mapId, agentId },
        ),
        client.fetch<string[]>(
          `*[_type == "screenshot" && map._ref == $mapId && agent._ref == $agentId]._id`,
          { mapId, agentId },
        ),
      ]);
      metas.forEach((id) => tx.delete(id));
      screenshots.forEach((id) => tx.delete(id));
    } else {
      const [screenshots, metas] = await Promise.all([
        client.fetch<string[]>(
          `*[_type == "screenshot" && agent._ref == $agentId]._id`,
          { agentId },
        ),
        client.fetch<string[]>(
          `*[_type == "mapAgentMeta" && agent._ref == $agentId]._id`,
          { agentId },
        ),
      ]);
      screenshots.forEach((id) => tx.delete(id));
      metas.forEach((id) => tx.delete(id));
      tx.delete(agentId);
    }

    await tx.commit();

    revalidateTag(TAGS.agents, { expire: 0 });
    revalidateTag(TAGS.screenshotsAll, { expire: 0 });
    if (mapId) {
      revalidateTag(TAGS.agentsByMap(mapId), { expire: 0 });
      revalidateTag(TAGS.agentRefsByMap(mapId), { expire: 0 });
    }
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function updateAgentViability(
  agentId: string,
  mapId: string,
  viability: string | null,
): Promise<ActionResult> {
  if (!agentId || !mapId) {
    return { ok: false, error: "agentId and mapId are required" };
  }
  try {
    const existing = await client.fetch<{ _id: string } | null>(
      `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId][0]{_id}`,
      { mapId, agentId },
    );

    if (existing) {
      await client
        .patch(existing._id)
        .set({ viability: viability ?? null })
        .commit();
    } else {
      await client.create({
        _type: "mapAgentMeta",
        map: { _type: "reference", _ref: mapId },
        agent: { _type: "reference", _ref: agentId },
        viability: viability ?? null,
      });
    }

    revalidateTag(TAGS.agentsByMap(mapId), { expire: 0 });
    revalidateTag(TAGS.agentRefsByMap(mapId), { expire: 0 });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Server error";
}
