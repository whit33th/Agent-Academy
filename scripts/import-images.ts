import { createReadStream, writeFileSync, mkdirSync } from "fs";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { client } from "../lib/sanity";

const TEMP_DIR = path.join(process.cwd(), "tmp-images");

interface ValorantMap {
  displayName: string;
  splash: string;
}

interface ValorantAgent {
  displayName: string;
  fullPortrait: string;
  role: { displayName: string };
}

async function downloadImage(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buffer);
}

async function uploadImageToSanity(filePath: string, title: string) {
  const asset = await client.assets.upload("image", createReadStream(filePath), {
    filename: path.basename(filePath),
  });
  return asset._id;
}

async function updateDocumentImage(docType: string, docName: string, imageAssetId: string) {
  const doc = await client.fetch(`*[_type == $type && name == $name][0]`, {
    type: docType,
    name: docName,
  });
  if (!doc) {
    console.log(`Document not found: ${docType} / ${docName}`);
    return;
  }

  await client
    .patch(doc._id)
    .set({
      image: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: imageAssetId,
        },
      },
    })
    .commit();

  console.log(`Updated ${docType}: ${docName}`);
}

async function main() {
  try {
    mkdirSync(TEMP_DIR, { recursive: true });

    // Fetch maps from Valorant API
    const mapsRes = await fetch("https://valorant-api.com/v1/maps");
    const mapsData = await mapsRes.json() as { data: ValorantMap[] };
    const apiMaps = mapsData.data.filter(
      (m) => !["Basic Training", "The Range", "Corrode", "Sunset"].includes(m.displayName)
    );

    // Fetch agents from Valorant API
    const agentsRes = await fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true");
    const agentsData = await agentsRes.json() as { data: ValorantAgent[] };
    const apiAgents = agentsData.data;

    // Get existing Sanity docs
    const sanityMaps = await client.fetch(`*[_type == "map"]{name}`);
    const sanityAgents = await client.fetch(`*[_type == "agent"]{name}`);

    // Download and upload map images
    for (const map of apiMaps) {
      const sanityDoc = sanityMaps.find((m: any) => m.name.toLowerCase() === map.displayName.toLowerCase());
      if (!sanityDoc) continue;

      const fileName = `map-${map.displayName}.png`;
      const filePath = path.join(TEMP_DIR, fileName);

      console.log(`Downloading map image: ${map.displayName}`);
      await downloadImage(map.splash, filePath);

      const assetId = await uploadImageToSanity(filePath, map.displayName);
      await updateDocumentImage("map", sanityDoc.name, assetId);

      await unlink(filePath);
    }

    // Download and upload agent images
    for (const agent of apiAgents) {
      const sanityDoc = sanityAgents.find((a: any) => a.name.toLowerCase() === agent.displayName.toLowerCase());
      if (!sanityDoc) continue;

      const fileName = `agent-${agent.displayName}.png`;
      const filePath = path.join(TEMP_DIR, fileName);

      console.log(`Downloading agent image: ${agent.displayName}`);
      await downloadImage(agent.fullPortrait, filePath);

      const assetId = await uploadImageToSanity(filePath, agent.displayName);
      await updateDocumentImage("agent", sanityDoc.name, assetId);

      await unlink(filePath);
    }

    console.log("Done importing images!");
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main();
