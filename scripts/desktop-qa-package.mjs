import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const files = ["desktop/dist/main.cjs", "desktop/dist/preload.cjs"];
const originals = new Map();
const server = createServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const port = server.address().port;
await new Promise((resolve, reject) =>
  server.close((error) => (error ? reject(error) : resolve())),
);
const output = path.resolve("outputs/desktop-qa-package");
await mkdir(path.dirname(output), { recursive: true });

try {
  for (const file of files) {
    const original = await readFile(file, "utf8");
    const occurrences =
      original.match(/var DESKTOP_PORT = 37491;/g)?.length ?? 0;
    if (occurrences !== 1)
      throw new Error(
        `Expected one desktop test port in ${file}; got ${occurrences}.`,
      );
    originals.set(file, original);
    await writeFile(
      file,
      original.replace(
        "var DESKTOP_PORT = 37491;",
        `var DESKTOP_PORT = ${port};`,
      ),
    );
  }

  const packageResult = spawnSync(
    process.execPath,
    [
      "node_modules/electron-builder/cli.js",
      "--config",
      "desktop/builder.config.cjs",
      "--win",
      "--dir",
      "--publish",
      "never",
      `--config.directories.output=${output}`,
    ],
    { stdio: "inherit" },
  );
  if (packageResult.status !== 0)
    throw new Error(
      `Electron QA packaging exited with ${packageResult.status}.`,
    );

  await writeFile(
    path.join(output, "win-unpacked", "resources", "app-update.yml"),
    "owner: whit33th\nrepo: Agent-Academy\nprovider: github\nreleaseType: release\nupdaterCacheDirName: agent-academy-desktop-updater\n",
  );

  const qa = spawnSync(
    process.execPath,
    [
      "scripts/desktop-qa.mjs",
      path.join(output, "win-unpacked", "Agent Academy.exe"),
    ],
    {
      stdio: "inherit",
      env: { ...process.env, AGENT_ACADEMY_DESKTOP_QA_PORT: String(port) },
    },
  );
  if (qa.status !== 0)
    throw new Error(`Packaged Electron QA exited with ${qa.status}.`);
} finally {
  for (const [file, content] of originals) await writeFile(file, content);
}
