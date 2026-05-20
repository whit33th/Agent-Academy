import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { mapName } = await request.json();
    if (!mapName) {
      return NextResponse.json({ error: "mapName is required" }, { status: 400 });
    }

    const slug = mapName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if map already exists in Sanity
    const existing = await client.fetch(
      `*[_type == "map" && (name == $name || slug.current == $slug)][0]`,
      { name: mapName, slug },
    );
    if (existing) {
      return NextResponse.json({ error: "Map already exists" }, { status: 400 });
    }

    const newMap = await client.create({
      _type: "map",
      name: mapName,
      slug: { _type: "slug", current: slug },
    });

    // Revalidate maps cache tag
    revalidateTag("sanity-maps", { expire: 0 });

    return NextResponse.json({ success: true, map: newMap });
  } catch (error: any) {
    console.error("Error adding map:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
