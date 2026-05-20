import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { agentId } = await request.json();
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    // Find and delete all screenshots associated with this agent to keep data clean
    const screenshots = await client.fetch<string[]>(
      `*[_type == "screenshot" && agent._ref == $agentId]._id`,
      { agentId }
    );

    const tx = client.transaction();
    screenshots.forEach((id) => tx.delete(id));
    tx.delete(agentId);
    
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
