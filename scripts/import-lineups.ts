import { createReadStream } from "fs";
import { readdir, stat } from "fs/promises";
import path from "path";
import { client } from "../lib/sanity";

const VALORANT_DIR = path.join(process.cwd(), "valorant");

const agentRoles: Record<string, string> = {
  killjoy: "sentinel",
  viper: "controller",
};

function determineAbilityType(agentName: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("ult")) return "ultimate";
  if (agentName.toLowerCase() === "viper" && (lower.includes("atk") || lower.includes("def"))) {
    return "wall";
  }
  if (agentName.toLowerCase() === "killjoy" && lower.includes("def")) {
    return "molly";
  }
  return "other";
}

async function findOrCreateAgent(name: string) {
  const existing = await client.fetch(`*[_type == "agent" && name == $name][0]`, { name });
  if (existing) return existing;

  const role = agentRoles[name.toLowerCase()] || "other";
  const doc = await client.create({
    _type: "agent",
    name,
    slug: { current: name.toLowerCase() },
    role,
  });
  console.log(`Created agent: ${name}`);
  return doc;
}

async function findOrCreateMap(name: string) {
  const existing = await client.fetch(`*[_type == "map" && name == $name][0]`, { name });
  if (existing) return existing;

  const doc = await client.create({
    _type: "map",
    name,
    slug: { current: name.toLowerCase().replace(/\s+/g, "-") },
  });
  console.log(`Created map: ${name}`);
  return doc;
}

async function uploadScreenshot(
  filePath: string,
  agentId: string,
  mapId: string
) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const agentDoc = await client.fetch(`*[_type == "agent" && _id == $id][0]`, { id: agentId });
  const abilityType = determineAbilityType(agentDoc?.name || "", fileName);

  const asset = await client.assets.upload("image", createReadStream(filePath));

  await client.create({
    _type: "screenshot",
    title: fileName,
    image: {
      _type: "image",
      asset: {
        _type: "reference",
        _ref: asset._id,
      },
    },
    map: {
      _type: "reference",
      _ref: mapId,
    },
    agent: {
      _type: "reference",
      _ref: agentId,
    },
    abilityType,
  });

  console.log(`Uploaded: ${fileName} (${abilityType})`);
}

async function main() {
  try {
    const entries = await readdir(VALORANT_DIR);
    const agents = entries.filter(async (e) => {
      const s = await stat(path.join(VALORANT_DIR, e));
      return s.isDirectory();
    });

    for (const agentName of entries) {
      const agentPath = path.join(VALORANT_DIR, agentName);
      const agentStat = await stat(agentPath);
      if (!agentStat.isDirectory()) continue;

      const agentDoc = await findOrCreateAgent(agentName);

      const mapEntries = await readdir(agentPath);
      for (const mapName of mapEntries) {
        const mapPath = path.join(agentPath, mapName);
        const mapStat = await stat(mapPath);
        if (!mapStat.isDirectory()) continue;

        const mapDoc = await findOrCreateMap(mapName);

        const files = await readdir(mapPath);
        for (const file of files) {
          const filePath = path.join(mapPath, file);
          const fileStat = await stat(filePath);
          if (!fileStat.isFile()) {
            // nested folder (e.g. "Ult placement")
            if (fileStat.isDirectory()) {
              const nestedFiles = await readdir(filePath);
              for (const nestedFile of nestedFiles) {
                const nestedPath = path.join(filePath, nestedFile);
                const nestedStat = await stat(nestedPath);
                if (nestedStat.isFile()) {
                  await uploadScreenshot(nestedPath, agentDoc._id, mapDoc._id);
                }
              }
            }
            continue;
          }

          const ext = path.extname(file).toLowerCase();
          if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;

          await uploadScreenshot(filePath, agentDoc._id, mapDoc._id);
        }
      }
    }

    console.log("Done!");
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main();
