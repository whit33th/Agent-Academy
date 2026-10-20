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
