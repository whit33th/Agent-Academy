import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

// Isolate the test package from an already running installed app. Only the local
// port in the compiled test artifact differs; sources and the normal release stay intact.
const file = path.resolve("desktop/dist/main.cjs");
const original = await readFile(file, "utf8");
if (!original.includes("var DESKTOP_PORT = 37491;"))
  throw new Error("Compile the desktop app before packaging Aim QA.");
try {
  await writeFile(
    file,
    original.replace("var DESKTOP_PORT = 37491;", "var DESKTOP_PORT = 37492;"),
  );
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/electron-builder/cli.js",
      "--config",
      "desktop/builder.config.cjs",
      "--win",
      "--dir",
      "--publish",
      "never",
      "--config.directories.output=outputs/aim-package",
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  await writeFile(file, original);
}
