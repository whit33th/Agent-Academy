/**
 * Downloads agent wallpapers from playvalorant.com media page,
 * extracts dark versions, and saves them to public/imgs/agents/.
 *
 * Usage: bun run scripts/download-playvalorant-wallpapers.ts
 */
import { mkdir, writeFile, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "imgs", "agents");
const TEMP_DIR = path.join(process.cwd(), "temp-wallpapers");

interface MediaItem {
  title: string;
  url: string;
}

const agentNameMap: Record<string, string> = {
  "iso wallpaper": "Iso",
  "deadlock wallpaper": "Deadlock",
  "gekko wallpaper": "Gekko",
  "harbor wallpaper": "Harbor",
  "tapeta z viper": "Viper",
  "tapeta z sovą": "Sova",
  "tapeta ze skye": "Skye",
  "tapeta z sage": "Sage",
  "tapeta z reyną": "Reyna",
  "tapeta z raze": "Raze",
  "tapeta z phoenixem": "Phoenix",
  "jett/phoenix": "Phoenix",
  "tapeta z killjoy": "Killjoy",
  "tapeta z omenem": "Omen",
  "tapeta z jett": "Jett",
  "tapeta z breachem": "Breach",
  "tapeta z brimstone'em": "Brimstone",
  "tapeta z cypherem": "Cypher",
  "podstawowa grafika: viper": "Viper",
  "podstawowa grafika: jett": "Jett",
  "tapeta z agentem": "Agent",
  "china launch wallpaper": "China",
};

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[']/g, "").trim();
}

function findDarkFile(files: string[]): string | null {
  const darkFiles = files.filter(
    (f) =>
      f.toLowerCase().includes("dark") &&
      (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg")),
  );
  if (darkFiles.length === 0) return null;
  // Prefer PNG, then the one with highest number (usually best quality)
  const pngs = darkFiles.filter((f) => f.endsWith(".png"));
  if (pngs.length > 0) {
    return pngs.sort().reverse()[0];
  }
  return darkFiles.sort().reverse()[0];
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  const child_process = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const proc = child_process.spawn("powershell.exe", [
      "-Command",
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
    ]);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Expand-Archive exited ${code}`));
    });
    proc.on("error", reject);
  });
}

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  // Fetch media page data
  const res = await fetch("https://playvalorant.com/pl-pl/media/");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Extract __NEXT_DATA__
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error("__NEXT_DATA__ not found");
  const data = JSON.parse(match[1]);
  const items: MediaItem[] =
    data.props?.pageProps?.page?.blades?.[2]?.items?.map((item: any) => ({
      title: item.title || "",
      url: item.action?.payload?.url || "",
    })) || [];

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TEMP_DIR, { recursive: true });

  const savedAgents = new Set<string>();
  let processed = 0;

  for (const item of items) {
    const normTitle = normalizeTitle(item.title);
    const agentName = agentNameMap[normTitle];
    if (!agentName || !item.url.endsWith(".zip")) continue;

    const safeName = agentName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const zipPath = path.join(TEMP_DIR, `${safeName}.zip`);
    const extractDir = path.join(TEMP_DIR, safeName);

    try {
      // Download zip
      const zipRes = await fetch(item.url);
      if (!zipRes.ok) {
        console.warn(`skip ${agentName}: ${zipRes.status}`);
        continue;
      }
      const buf = Buffer.from(await zipRes.arrayBuffer());
      await writeFile(zipPath, buf);

      // Extract
      await extractZip(zipPath, extractDir);

      // Find dark file
      const allFiles = await getAllFiles(extractDir);
      const darkFile = findDarkFile(allFiles);
      if (!darkFile) {
        console.warn(`no dark file for ${agentName}`);
        continue;
      }

      // Copy to output
      const ext = path.extname(darkFile);
      const outPath = path.join(OUT_DIR, `${safeName}${ext}`);
      const fileBuf = await readFile(darkFile);
      await writeFile(outPath, fileBuf);

      savedAgents.add(agentName);
      processed++;
      console.log(
        `saved ${agentName}: ${path.basename(darkFile)} (${(fileBuf.length / 1024 / 1024).toFixed(2)}MB)`,
      );
    } catch (err) {
      console.error(`error for ${agentName}:`, err);
    }
  }

  // Cleanup
  try {
    await rm(TEMP_DIR, { recursive: true, force: true });
  } catch {}

  console.log(`\nDone — ${processed} agent dark wallpapers saved to ${OUT_DIR}`);
  console.log("Agents:", [...savedAgents].sort().join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
