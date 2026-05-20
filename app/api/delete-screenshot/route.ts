import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const { screenshotId } = await request.json();
    if (!screenshotId) {
      return NextResponse.json({ error: "screenshotId is required" }, { status: 400 });
    }

    await client.delete(screenshotId);

    // Revalidate cache tags so the UI updates immediately
    revalidateTag("sanity-screenshots", { expire: 0 });
    revalidateTag("sanity-agent-refs-by-map", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting screenshot:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
