import { createHash, randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const stage = path.join(root, "outputs", `catalog-${randomUUID()}`);
const images = path.join(stage, "images");
const output = path.join(root, "public", "catalog");
const snapshot = path.join(root, "lib", "generated", "valorant-catalog.json");
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const downloads = new Map();

async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return response;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

function localImage(url, width) {
  if (!url) return Promise.resolve(null);
  const source = new URL(url);
  if (
    source.protocol !== "https:" ||
    source.hostname !== "media.valorant-api.com"
  )
    throw new Error("Unexpected catalog asset host");
  const name = `${createHash("sha256")
    .update(url + width)
    .digest("hex")
    .slice(0, 24)}.webp`;
  if (!downloads.has(name))
    downloads.set(
      name,
      (async () => {
        const existing = path.join(output, name);
        try {
          if ((await stat(existing)).size > 0) {
            await cp(existing, path.join(images, name));
            return `/catalog/${name}`;
          }
        } catch {
          /* Download a missing asset. */
        }
        const bytes = Buffer.from(await (await request(url)).arrayBuffer());
        await sharp(bytes)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 92, effort: 5 })
          .toFile(path.join(images, name));
        return `/catalog/${name}`;
      })(),
    );
  return downloads.get(name);
}

async function mapBatches(rows, transform) {
  const result = [];
  for (let index = 0; index < rows.length; index += 3) {
    result.push(
      ...(await Promise.all(rows.slice(index, index + 3).map(transform))),
    );
    console.log(`Catalog: ${Math.min(index + 3, rows.length)}/${rows.length}`);
  }
  return result;
}

await mkdir(images, { recursive: true });
try {
  const [agentResponse, mapResponse, versionResponse] = await Promise.all([
    request("https://valorant-api.com/v1/agents?isPlayableCharacter=true"),
    request("https://valorant-api.com/v1/maps"),
    request("https://valorant-api.com/v1/version"),
  ]);
  const [agentData, mapData, versionData] = await Promise.all([
    agentResponse.json(),
    mapResponse.json(),
    versionResponse.json(),
  ]);
  if (
    agentData.status !== 200 ||
    mapData.status !== 200 ||
    agentData.data.length < 20 ||
    mapData.data.length < 10
  )
    throw new Error("Incomplete Valorant catalog");
  const agents = await mapBatches(agentData.data, async (agent) => {
    const slug = normalize(agent.displayName);
    if (!agent.uuid || !slug || !agent.role || !agent.abilities?.length)
      throw new Error("Invalid agent");
    let artBackground = null;
    for (const extension of ["jpg", "png"]) {
      const relative = `/imgs/agents/${slug}.${extension}`;
      try {
        await stat(path.join(root, "public", relative));
        artBackground = relative;
        break;
      } catch {
        /* Optional local art. */
      }
    }
    const portrait = await localImage(
      agent.fullPortrait ?? agent.displayIcon,
      1024,
    );
    return [
      slug,
      {
        uuid: agent.uuid,
        displayName: agent.displayName,
        description: agent.description,
        role: {
          ...agent.role,
          displayIcon: await localImage(agent.role.displayIcon, 64),
        },
        fullPortrait: portrait,
        displayIcon: await localImage(agent.displayIcon, 128),
        background: await localImage(agent.background, 512),
        backgroundGradientColors: agent.backgroundGradientColors ?? [],
        artBackground,
        abilities: await Promise.all(
          agent.abilities.map(async (ability) => ({
            ...ability,
            displayIcon: await localImage(ability.displayIcon, 128),
          })),
        ),
      },
    ];
  });
  const maps = await mapBatches(
    mapData.data.filter(
      (map) =>
        !["The Range", "Basic Training"].includes(map.displayName) &&
        !map.displayName.startsWith("Skirmish"),
    ),
    async (map) => {
      if (!map.uuid || !map.displayName || !map.splash)
        throw new Error("Invalid map");
      return [
        normalize(map.displayName),
        {
          uuid: map.uuid,
          displayName: map.displayName,
          splash: await localImage(map.splash, 1440),
          displayIcon: await localImage(map.displayIcon, 2048),
        },
      ];
    },
  );
  if (
    new Set(agents.map(([key]) => key)).size !== agents.length ||
    new Set(maps.map(([key]) => key)).size !== maps.length
  )
    throw new Error("Duplicate catalog slug");
  const data = {
    schemaVersion: 1,
    gameVersion: versionData.data?.version ?? "unknown",
    syncedAt: new Date().toISOString(),
    agents: Object.fromEntries(agents),
    maps: Object.fromEntries(maps),
  };
  const serialized = JSON.stringify(data, null, 2) + "\n";
  // Publish assets first. A failed refresh leaves the previous snapshot usable.
  await mkdir(output, { recursive: true });
  await cp(images, output, { recursive: true });
  await mkdir(path.dirname(snapshot), { recursive: true });
  await writeFile(snapshot + ".tmp", serialized);
  await rename(snapshot + ".tmp", snapshot);
  for (const file of await readdir(output, { withFileTypes: true })) {
    if (
      file.isFile() &&
      /^[a-f0-9]{24}\.webp$/.test(file.name) &&
      !downloads.has(file.name)
    )
      await unlink(path.join(output, file.name));
  }
  console.log(
    `Saved ${agents.length} agents, ${maps.length} maps and ${downloads.size} local images.`,
  );
} finally {
  // Only this invocation's staging directory can be removed.
  if (!stage.startsWith(path.join(root, "outputs") + path.sep))
    throw new Error("Unsafe catalog staging path");
  await rm(stage, { recursive: true, force: true });
}
