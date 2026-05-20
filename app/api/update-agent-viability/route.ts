import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { agentId, mapId, viability } = await request.json();
    if (!agentId || !mapId) {
      return NextResponse.json({ error: "agentId and mapId are required" }, { status: 400 });
    }

    // Find the mapAgentMeta document
    const existingMeta = await client.fetch(
      `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId][0]`,
      { mapId, agentId }
    );

    if (existingMeta) {
      // Update the viability field
      await client
        .patch(existingMeta._id)
        .set({ viability: viability || null })
        .commit();
    } else {
      // Create it if it doesn't exist
      await client.create({
        _type: "mapAgentMeta",
        map: {
          _type: "reference",
          _ref: mapId,
        },
        agent: {
          _type: "reference",
          _ref: agentId,
        },
        viability: viability || null,
      });
    }

    // Revalidate cache tags so the UI updates immediately
    revalidateTag("sanity-agents", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });
    revalidateTag("sanity-agent-refs-by-map", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating agent viability:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
