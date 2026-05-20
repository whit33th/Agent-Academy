import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { agentName } = await request.json();
    if (!agentName) {
      return NextResponse.json({ error: "agentName is required" }, { status: 400 });
    }

    const slug = agentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if agent already exists in Sanity
    const existing = await client.fetch(
      `*[_type == "agent" && (name == $name || slug.current == $slug)][0]`,
      { name: agentName, slug },
    );
    if (existing) {
      return NextResponse.json({ error: "Agent already exists" }, { status: 400 });
    }

    const newAgent = await client.create({
      _type: "agent",
      name: agentName,
      slug: { _type: "slug", current: slug },
    });

    // Revalidate agent cache tags
    revalidateTag("sanity-agents", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });

    return NextResponse.json({ success: true, agent: newAgent });
  } catch (error: any) {
    console.error("Error adding agent:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
