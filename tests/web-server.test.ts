import { afterEach, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const { fork } = vi.hoisted(() => ({ fork: vi.fn() }));
vi.mock("electron", () => ({ utilityProcess: { fork } }));
import { startWebServer } from "../desktop/src/web-server";
afterEach(() => {
  vi.restoreAllMocks();
  fork.mockReset();
});
it("reports an occupied port without starting or terminating any process", async () => {
  const foreign = createServer((_request, response) =>
    response.end("foreign-app"),
  );
  await new Promise<void>((resolve) => foreign.listen(0, "127.0.0.1", resolve));
  const address = foreign.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test address");
  const endpoint = {
    port: address.port,
    origin: `http://127.0.0.1:${address.port}`,
  };
  try {
    await expect(startWebServer("unread-directory", endpoint)).rejects.toThrow(
      `Port ${address.port} is already in use`,
    );
    expect(fork).not.toHaveBeenCalled();
    expect(await (await fetch(endpoint.origin)).text()).toBe("foreign-app");
  } finally {
    await new Promise<void>((resolve, reject) =>
      foreign.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it("cleans up a failed startup and distinguishes an unexpected server exit from explicit shutdown", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "academy-server-"));
  const endpoint = { port: 0, origin: "http://127.0.0.1:1" };
  await writeFile(path.join(directory, "desktop-public-env.json"), "{}");
  try {
    const failed = Object.assign(new EventEmitter(), { kill: vi.fn() });
    fork.mockImplementationOnce(() => {
      queueMicrotask(() => failed.emit("exit", 1));
      return failed;
    });
    await expect(startWebServer(directory, endpoint)).rejects.toThrow(
      "exited during startup",
    );
    expect(failed.kill).not.toHaveBeenCalled();
    let nonce = "";
    const child = Object.assign(new EventEmitter(), { kill: vi.fn() });
    fork.mockImplementation(
      (_file, _args, options: { env: Record<string, string> }) => {
        nonce = options.env.AGENT_ACADEMY_SERVER_NONCE;
        return child;
      },
    );
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({ app: "agent-academy", nonce }),
    );
    const crashed = vi.fn();
    const stop = await startWebServer(directory, endpoint, crashed);
    child.emit("exit", 1);
    expect(crashed).toHaveBeenCalledOnce();
    stop();
    expect(child.kill).not.toHaveBeenCalled();
    const intentional = Object.assign(new EventEmitter(), { kill: vi.fn() });
    fork.mockImplementation(
      (_file, _args, options: { env: Record<string, string> }) => {
        nonce = options.env.AGENT_ACADEMY_SERVER_NONCE;
        return intentional;
      },
    );
    const stopped = vi.fn();
    const quit = await startWebServer(directory, endpoint, stopped);
    quit();
    intentional.emit("exit", 0);
    expect(intentional.kill).toHaveBeenCalledOnce();
    expect(stopped).not.toHaveBeenCalled();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
