import { expect, it, vi } from "vitest";
import { createServer } from "node:http";
const { fork } = vi.hoisted(() => ({ fork: vi.fn() }));
vi.mock("electron", () => ({ utilityProcess: { fork } }));
import { startWebServer } from "../desktop/src/web-server";
it("reports an occupied port without starting or terminating any process", async () => {
  const foreign = createServer((_request, response) => response.end("foreign-app"));
  await new Promise<void>(resolve => foreign.listen(0, "127.0.0.1", resolve));
  const address = foreign.address();
  if (!address || typeof address === "string") throw new Error("Missing test address");
  const endpoint = { port: address.port, origin: `http://127.0.0.1:${address.port}` };
  try {
    await expect(startWebServer("unread-directory", endpoint)).rejects.toThrow(`Port ${address.port} is already in use`);
    expect(fork).not.toHaveBeenCalled();
    expect(await (await fetch(endpoint.origin)).text()).toBe("foreign-app");
  } finally { await new Promise<void>((resolve, reject) => foreign.close(error => error ? reject(error) : resolve())); }
});
