import { rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
for (const name of ["main", "preload"]) {
  await build({
    entryPoints: ["desktop/src/" + name + ".ts"],
    outfile: "desktop/dist/" + name + ".cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    external: ["electron"],
    logLevel: "info",
  });
}
const vendor = path.resolve("desktop/dist/vendor");
await rm(vendor, { recursive: true, force: true });
