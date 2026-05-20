import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const mapSlug = formData.get("mapSlug") as string;
    const mapName = formData.get("mapName") as string;
    const agentSlug = formData.get("agentSlug") as string;
    const agentName = formData.get("agentName") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const abilityType = formData.get("abilityType") as string;
    const imageFile = formData.get("image") as File | null;

    if (!mapSlug || !agentSlug || !title || !abilityType || !imageFile) {
      return NextResponse.json(
        { error: "Missing required fields (mapSlug, agentSlug, title, abilityType, image)" },
        { status: 400 },
      );
    }

    // 1. Resolve or create map document in Sanity
    let mapDoc = await client.fetch(
      `*[_type == "map" && slug.current == $slug][0]`,
      { slug: mapSlug },
    );
    if (!mapDoc) {
      console.log(`Map ${mapSlug} not found in Sanity. Creating...`);
      mapDoc = await client.create({
        _type: "map",
        name: mapName || mapSlug.charAt(0).toUpperCase() + mapSlug.slice(1),
        slug: { _type: "slug", current: mapSlug },
      });
      revalidateTag("sanity-maps", { expire: 0 });
    }

    // 2. Resolve or create agent document in Sanity
    let agentDoc = await client.fetch(
      `*[_type == "agent" && slug.current == $slug][0]`,
      { slug: agentSlug },
    );
    if (!agentDoc) {
      console.log(`Agent ${agentSlug} not found in Sanity. Creating...`);
      agentDoc = await client.create({
        _type: "agent",
        name: agentName || agentSlug.charAt(0).toUpperCase() + agentSlug.slice(1),
        slug: { _type: "slug", current: agentSlug },
      });
      revalidateTag("sanity-agents", { expire: 0 });
    }

    // 2b. Ensure mapAgentMeta exists for this map-agent combo
    const existingMeta = await client.fetch(
      `*[_type == "mapAgentMeta" && map._ref == $mapId && agent._ref == $agentId][0]`,
      { mapId: mapDoc._id, agentId: agentDoc._id }
    );
    if (!existingMeta) {
      console.log(`Creating mapAgentMeta reference for ${agentSlug} on ${mapSlug}...`);
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
        viability: "a",
      });
      revalidateTag("sanity-agents-by-map", { expire: 0 });
      revalidateTag("sanity-agent-refs-by-map", { expire: 0 });
    }

    // 3. Upload image file to Sanity
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("Uploading screenshot image to Sanity...");
    const imageAsset = await client.assets.upload("image", buffer, {
      filename: imageFile.name,
      contentType: imageFile.type,
    });

    // 4. Create screenshot document
    console.log("Creating screenshot document in Sanity...");
    const newScreenshot = await client.create({
      _type: "screenshot",
      title,
      description: description || "",
      abilityType,
      image: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: imageAsset._id,
        },
      },
      map: {
        _type: "reference",
        _ref: mapDoc._id,
      },
      agent: {
        _type: "reference",
        _ref: agentDoc._id,
      },
    });

    // 5. Revalidate cache tags so the UI updates immediately
    revalidateTag("sanity-screenshots", { expire: 0 });
    revalidateTag("sanity-agent-refs-by-map", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });

    return NextResponse.json({ success: true, screenshot: newScreenshot });
  } catch (error: any) {
    console.error("Error uploading screenshot:", error);
    return NextResponse.json(
      { error: error.message || "Server error occurred during upload" },
      { status: 500 },
    );
  }
}
