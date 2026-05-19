import { createReadStream } from "fs";
import { readdir, stat } from "fs/promises";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { client } from "../lib/sanity";

const VALORANT_DIR = path.join(process.cwd(), "valorant");

const agentRoles: Record<string, string> = {
  killjoy: "sentinel",
  viper: "controller",
};

function determineAbilityType(agentName: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes("ult")) return "ultimate";
  if (
    agentName.toLowerCase() === "viper" &&
    (lower.includes("atk") || lower.includes("def"))
  ) {
    return "wall";
  }
  if (agentName.toLowerCase() === "killjoy" && lower.includes("def")) {
    return "molly";
  }
  return "other";
}

async function findOrCreateAgent(name: string) {
  const existing = await client.fetch(
    `*[_type == "agent" && name == $name][0]`,
    { name },
  );
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
  const existing = await client.fetch(`*[_type == "map" && name == $name][0]`, {
    name,
  });
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
  mapId: string,
) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const agentDoc = await client.fetch(`*[_type == "agent" && _id == $id][0]`, {
    id: agentId,
  });
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

async function clearExistingScreenshots() {
  const screenshots = await client.fetch(`*[_type == "screenshot"]{_id}`);
  if (screenshots.length === 0) return;
  console.log(`Removing ${screenshots.length} existing screenshots...`);
  await Promise.all(
    screenshots.map((s: { _id: string }) =>
      client.delete(s._id).catch(() => {}),
    ),
  );
  console.log("Cleared existing screenshots.");
}

async function main() {
  try {
    await clearExistingScreenshots();
    const entries = await readdir(VALORANT_DIR);
    const agentEntries = await Promise.all(
      entries.map(async (e) => {
        const s = await stat(path.join(VALORANT_DIR, e));
        return { name: e, isDir: s.isDirectory() };
      }),
    );
    const agentNames: string[] = [];
    for (const e of agentEntries) {
      if (e.isDir) agentNames.push(e.name);
    }

    const uploadTasks: Promise<void>[] = [];
    const validExts = new Set([".png", ".jpg", ".jpeg", ".webp"]);

    // Pre-create all agents in parallel
    const agentDocs = await Promise.all(
      agentNames.map(async (agentName) => {
        const agentPath = path.join(VALORANT_DIR, agentName);
        const agentDoc = await findOrCreateAgent(agentName);
        return { agentName, agentPath, agentDoc };
      }),
    );

    for (const { agentPath, agentDoc } of agentDocs) {
      const mapEntries = await readdir(agentPath);
      const mapStats = await Promise.all(
        mapEntries.map(async (mapName) => {
          const mapPath = path.join(agentPath, mapName);
          const s = await stat(mapPath);
          return { name: mapName, path: mapPath, isDir: s.isDirectory() };
        }),
      );

      for (const mapEntry of mapStats) {
        if (!mapEntry.isDir) continue;
        const mapDoc = await findOrCreateMap(mapEntry.name);

        const files = await readdir(mapEntry.path);
        const fileStats = await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(mapEntry.path, file);
            const s = await stat(filePath);
            return {
              name: file,
              path: filePath,
              isFile: s.isFile(),
              isDir: s.isDirectory(),
            };
          }),
        );

        for (const file of fileStats) {
          if (file.isDir) {
            const nestedFiles = await readdir(file.path);
            const nestedPaths = nestedFiles.map((nf) =>
              path.join(file.path, nf),
            );
            const nestedStats = await Promise.all(
              nestedPaths.map(async (np) => {
                const s = await stat(np);
                return { path: np, isFile: s.isFile() };
              }),
            );
            for (const ns of nestedStats) {
              if (ns.isFile) {
                uploadTasks.push(
                  uploadScreenshot(ns.path, agentDoc._id, mapDoc._id),
                );
              }
            }
            continue;
          }

          if (!file.isFile) continue;
          const ext = path.extname(file.name).toLowerCase();
          if (!validExts.has(ext)) continue;

          uploadTasks.push(
            uploadScreenshot(file.path, agentDoc._id, mapDoc._id),
          );
        }
      }
    }

    await Promise.all(uploadTasks);

    console.log("Done!");
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main();
