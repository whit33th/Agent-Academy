import { spawn, spawnSync } from "node:child_process";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const compiled = spawnSync(process.execPath, ["scripts/desktop-compile.mjs"], {
  stdio: "inherit",
});
if (compiled.status !== 0) process.exit(compiled.status ?? 1);
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"],
  { stdio: "inherit" },
);
let desktop;
function stop() {
  desktop?.kill();
  server.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  const deadline = Date.now() + 45000;
  let ready = false;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      ready = (await fetch("http://127.0.0.1:3000/api/desktop-health")).ok;
    } catch {
      /* Starting. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("Next.js development server did not start");
  const env = {
    ...process.env,
    AGENT_ACADEMY_DEV_URL: "http://127.0.0.1:3000",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const { default: electron } = await import("electron");
  desktop = spawn(electron, ["desktop"], { stdio: "inherit", env });
  desktop.on("exit", (code) => {
    server.kill();
    process.exitCode = code ?? 1;
  });
} catch (error) {
  stop();
  throw error;
}
