/**
 * Downloads background.png from valorant-api.com for agents missing
 * local dark wallpapers in public/imgs/agents/.
 *
 * Usage: bun run scripts/download-missing-backgrounds.ts
 */
import { writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "imgs", "agents");

async function main() {
  // Fetch all agents
  const res = await fetch(
    "https://valorant-api.com/v1/agents?isPlayableCharacter=true",
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Get existing files
  const existing = new Set<string>();
  try {
    const files = await readdir(OUT_DIR);
    for (const f of files) {
      const base = path.basename(f, path.extname(f));
      existing.add(base);
    }
  } catch {}

  const agents: Array<{ displayName: string; uuid: string; background: string }> =
    data.data ?? [];

  let downloaded = 0;
  for (const agent of agents) {
    const slug = agent.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    if (existing.has(slug)) {
      console.log(`skip ${agent.displayName}: already exists`);
      continue;
    }
    if (!agent.background) {
      console.warn(`skip ${agent.displayName}: no background URL`);
      continue;
    }

    try {
      const bgRes = await fetch(agent.background);
      if (!bgRes.ok) {
        console.warn(`skip ${agent.displayName}: ${bgRes.status}`);
        continue;
      }
      const buf = Buffer.from(await bgRes.arrayBuffer());
      const outPath = path.join(OUT_DIR, `${slug}.png`);
      await writeFile(outPath, buf);
      downloaded++;
      console.log(
        `saved ${agent.displayName}: ${slug}.png (${(buf.length / 1024).toFixed(1)}KB)`,
      );
    } catch (err) {
      console.error(`error for ${agent.displayName}:`, err);
    }
  }

  console.log(`\nDone — ${downloaded} backgrounds downloaded to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
