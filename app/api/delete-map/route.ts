import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { mapId } = await request.json();
    if (!mapId) {
      return NextResponse.json({ error: "mapId is required" }, { status: 400 });
    }

    // Find and delete all screenshots associated with this map to keep data clean
    const screenshots = await client.fetch<string[]>(
      `*[_type == "screenshot" && map._ref == $mapId]._id`,
      { mapId }
    );

    // Find and delete all mapAgentMeta associations linked to this map
    const metas = await client.fetch<string[]>(
      `*[_type == "mapAgentMeta" && map._ref == $mapId]._id`,
      { mapId }
    );

    const tx = client.transaction();
    screenshots.forEach((id) => tx.delete(id));
    metas.forEach((id) => tx.delete(id));
    tx.delete(mapId);
    
    await tx.commit();

    // Revalidate cache tags so the UI updates immediately
    revalidateTag("sanity-maps", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });
    revalidateTag("sanity-screenshots", { expire: 0 });
    revalidateTag("sanity-agent-refs-by-map", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting map:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
