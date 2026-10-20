import { safeStorage } from "electron";
import { DiskCache } from "./disk-cache";
import {
  CacheSession,
  clerkIssuer,
  createTokenVerifier,
} from "./cache-session";

export function createCollectionCache(
  directory: string,
  config: Record<string, string>,
) {
  const disk = new DiskCache(directory, {
    encrypt(value) {
      if (!safeStorage.isEncryptionAvailable())
        throw new Error("Private cache encryption unavailable");
      return safeStorage.encryptString(value);
    },
    decrypt: (value) => safeStorage.decryptString(value),
  });
  const session = new CacheSession(
    createTokenVerifier(
      clerkIssuer(config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      directory,
    ),
  );
  const pendingImages = new Map<string, Promise<string | null>>();
  let generation = 0;
  const allowedOrigins = new Set([
    new URL(config.NEXT_PUBLIC_CONVEX_URL).origin,
    "https://cdn.sanity.io",
  ]);

  async function image(
    url: string,
    privateData: boolean,
  ): Promise<string | null> {
    const source = new URL(url);
    if (source.protocol !== "https:" || !allowedOrigins.has(source.origin))
      throw new Error("Unexpected image origin");
    const scope = session.scope(privateData);
    const key = `image:${url}`;
    const pendingKey = `${scope}:${key}`;
    const existing = pendingImages.get(pendingKey);
    if (existing) return existing;
    const currentGeneration = generation;
    const request = (async () => {
      const cached = await disk.read(scope, key);
      if (typeof cached === "string")
        return currentGeneration === generation &&
          session.scope(privateData) === scope
          ? cached
          : null;
      try {
        const response = await fetch(url, {
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        });
        const type = response.headers.get("Content-Type")?.split(";")[0];
        if (
          !response.ok ||
          !type ||
          !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(
            type,
          )
        )
          return null;
        if (Number(response.headers.get("Content-Length")) > 10 * 1024 * 1024)
          return null;
        const reader = response.body?.getReader();
        if (!reader) return null;
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 10 * 1024 * 1024) {
            await reader.cancel();
            return null;
          }
          chunks.push(value);
        }
        if (
          currentGeneration !== generation ||
          session.scope(privateData) !== scope
        )
          return null;
        const data = `data:${type};base64,${Buffer.concat(chunks).toString("base64")}`;
        await disk.write(scope, key, data);
        return currentGeneration === generation ? data : null;
      } catch {
        return null;
      }
    })().finally(() => {
      pendingImages.delete(pendingKey);
    });
    pendingImages.set(pendingKey, request);
    return request;
  }

  return async (
    action: unknown,
    key: unknown,
    privateData: unknown,
    value: unknown,
  ): Promise<unknown> => {
    if (action === "authorize") {
      if (key !== null && typeof key !== "string")
        throw new Error("Invalid cache session");
      generation++;
      if (key === null) {
        await session.authorize(null);
        await disk.clearPrivate();
        return false;
      }
      return session.authorize(key);
    }
    if (typeof key !== "string" || typeof privateData !== "boolean")
      throw new Error("Invalid cache request");
    if (action === "image") return image(key, privateData);
    const scope = session.scope(privateData);
    if (action === "read") {
      const currentGeneration = generation;
      const data = await disk.read(scope, key);
      return currentGeneration === generation &&
        scope === session.scope(privateData)
        ? data
        : null;
    }
    if (action === "write") return disk.write(scope, key, value);
    throw new Error("Unknown cache operation");
  };
}
