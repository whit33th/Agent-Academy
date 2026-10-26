import { build } from "esbuild";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import electron from "electron";

const output = path.resolve("outputs/update-qa");
await mkdir(output, { recursive: true });
const entry = path.join(output, "runner.cjs");
await build({
  entryPoints: ["scripts/update-qa-runner.ts"],
  outfile: entry,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["electron"],
});
const child = spawn(electron, [entry, ...process.argv.slice(2)], {
  stdio: "inherit",
  windowsHide: true,
});
const timeout = setTimeout(() => child.kill(), 180_000);
child.once("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.once("exit", (code) => {
  clearTimeout(timeout);
  process.exitCode = code ?? 1;
});
