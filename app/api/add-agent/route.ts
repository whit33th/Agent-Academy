import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { agentName, mapSlug } = await request.json();
    if (!agentName) {
      return NextResponse.json({ error: "agentName is required" }, { status: 400 });
    }

    const slug = agentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // 1. Resolve or create global Agent document
    let agentDoc = await client.fetch(
      `*[_type == "agent" && (name == $name || slug.current == $slug)][0]`,
      { name: agentName, slug },
    );
    
    if (!agentDoc) {
      console.log(`Agent ${agentName} not found in Sanity. Creating globally...`);
      agentDoc = await client.create({
        _type: "agent",
        name: agentName,
        slug: { _type: "slug", current: slug },
      });
    }

    // 2. Resolve map document and associate agent with map via mapAgentMeta if mapSlug is provided
    if (mapSlug) {
      const mapDoc = await client.fetch(
        `*[_type == "map" && slug.current == $slug][0]`,
        { slug: mapSlug }
      );

      if (mapDoc) {
        // Check if mapAgentMeta already exists for this map-agent combo
        const existingMeta = await client.fetch(
          `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId][0]`,
          { mapId: mapDoc._id, agentId: agentDoc._id }
        );

        if (!existingMeta) {
          console.log(`Creating mapAgentMeta reference linking agent ${agentName} to map ${mapSlug}...`);
          await client.create({
            _type: "mapAgentMeta",
            map: {
              _type: "reference",
              _ref: mapDoc._id,
            },
            agent: {
              _type: "reference",
              _ref: agentDoc._id,
            },
          });
        }
      }
    }

    // Revalidate cache tags so the UI updates immediately
    revalidateTag("sanity-agents", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });
    revalidateTag("sanity-agent-refs-by-map", { expire: 0 });

    return NextResponse.json({ success: true, agent: agentDoc });
  } catch (error: any) {
    console.error("Error adding agent:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
