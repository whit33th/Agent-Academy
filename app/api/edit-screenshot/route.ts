import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const screenshotId = formData.get("screenshotId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const abilityType = formData.get("abilityType") as string;
    const imageFile = formData.get("image") as File | null;

    if (!screenshotId || !title || !abilityType) {
      return NextResponse.json(
        { error: "Missing required fields (screenshotId, title, abilityType)" },
        { status: 400 }
      );
    }

    const patchData: any = {
      title,
      description: description || "",
      abilityType,
    };

    if (imageFile && imageFile.size > 0) {
      // Upload new image asset to Sanity
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log("Uploading new screenshot image to Sanity...");
      const imageAsset = await client.assets.upload("image", buffer, {
        filename: imageFile.name,
        contentType: imageFile.type,
      });

      patchData.image = {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: imageAsset._id,
        },
      };
    }

    await client.patch(screenshotId).set(patchData).commit();

    // Revalidate cache tags so the UI updates immediately
    revalidateTag("sanity-screenshots", { expire: 0 });
    revalidateTag("sanity-agent-refs-by-map", { expire: 0 });
    revalidateTag("sanity-agents-by-map", { expire: 0 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error editing screenshot:", error);
    return NextResponse.json(
      { error: error.message || "Server error occurred during edit" },
      { status: 500 }
    );
  }
}
