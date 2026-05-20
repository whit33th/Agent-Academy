import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { agentId, mapId } = await request.json();
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const tx = client.transaction();

    if (mapId) {
      // Find the specific mapAgentMeta document linking this agent to this map
      const metas = await client.fetch<string[]>(
        `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId]._id`,
        { mapId, agentId }
      );
      metas.forEach((id) => tx.delete(id));

      // Delete all screenshots associated with this agent on this map
      const screenshots = await client.fetch<string[]>(
        `*[_type == "screenshot" && map._ref == $mapId && agent._ref == $agentId]._id`,
        { mapId, agentId }
      );
      screenshots.forEach((id) => tx.delete(id));
    } else {
      // Global deletion: Delete all screenshots associated with this agent to keep data clean
      const screenshots = await client.fetch<string[]>(
        `*[_type == "screenshot" && agent._ref == $agentId]._id`,
        { agentId }
      );
      screenshots.forEach((id) => tx.delete(id));
      
      // Delete all mapAgentMeta associations
      const metas = await client.fetch<string[]>(
        `*[_type == "mapAgentMeta" && agent._ref == $agentId]._id`,
        { agentId }
      );
      metas.forEach((id) => tx.delete(id));

      tx.delete(agentId);
    }
    
    await tx.commit();

    // Revalidate cache tags so the UI updates immediately
    revalidateTag("sanity-agents", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });
    revalidateTag("sanity-screenshots", { expire: 0 });
    revalidateTag("sanity-agent-refs-by-map", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting agent:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
