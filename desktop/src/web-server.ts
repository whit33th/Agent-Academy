import { utilityProcess } from "electron";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DESKTOP_ORIGIN, DESKTOP_PORT } from "../../lib/desktop/protocol";

export async function startWebServer(webRoot: string, endpoint = { port: DESKTOP_PORT, origin: DESKTOP_ORIGIN }): Promise<() => void> {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error(`Port ${endpoint.port} is already in use. Close the other Agent Academy instance or the app using that port, then retry.`)));
    probe.listen(endpoint.port, "127.0.0.1", () => probe.close(() => resolve()));
  });
  const config = JSON.parse(await readFile(path.join(webRoot, "desktop-public-env.json"), "utf8")) as Record<string, string>;
  const nonce = randomUUID();
  const env: Record<string, string> = { NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(endpoint.port), AGENT_ACADEMY_SERVER_NONCE: nonce };
  for (const key of ["SystemRoot", "SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "LOCALAPPDATA", "APPDATA", "USERPROFILE"])
    if (process.env[key]) env[key] = process.env[key]!;
  for (const [key, value] of Object.entries(config)) if (key.startsWith("NEXT_PUBLIC_") && typeof value === "string") env[key] = value;
  const child = utilityProcess.fork(path.join(webRoot, "server.js"), [], { cwd: webRoot, env, stdio: "pipe", serviceName: "Agent Academy UI" });
  child.stdout?.on("data", (data: Buffer) => process.stdout.write(data));
  child.stderr?.on("data", (data: Buffer) => process.stderr.write(data));
  let exited = false;
  child.once("exit", () => { exited = true; });
  const stop = () => { if (!exited) child.kill(); };
  try {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline && !exited) {
      try {
        const response = await fetch(`${endpoint.origin}/api/desktop-health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          const health = await response.json() as { app?: string; nonce?: string };
          if (health.app === "agent-academy" && health.nonce === nonce) return stop;
        }
      } catch { /* Wait for the owned utility process. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(exited ? "The bundled Next.js server exited during startup." : "The bundled Next.js server did not become ready.");
  } catch (error) { stop(); throw error; }
}
