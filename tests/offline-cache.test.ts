import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { DiskCache } from "../desktop/src/disk-cache";
import {
  CacheSession,
  createTokenVerifier,
} from "../desktop/src/cache-session";

const cipher = {
  encrypt: (text: string) => Buffer.from(text.split("").reverse().join("")),
  decrypt: (bytes: Buffer) => bytes.toString().split("").reverse().join(""),
};
describe("offline collection cache", () => {
  it("separates accounts, encrypts private entries, purges them on logout and survives corrupt data", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "academy-cache-"));
    try {
      const cache = new DiskCache(directory, cipher);
      await cache.write("alice", "lineups", { title: "private-setup" });
      await cache.write("public", "feed", { title: "public-setup" });
      expect(await cache.read("bob", "lineups")).toBeNull();
      expect(await cache.read("alice", "lineups")).toEqual({
        title: "private-setup",
      });
      const files = await readdir(directory);
      const contents = await Promise.all(
        files
          .filter((name) => name.endsWith(".cache"))
          .map((name) => readFile(path.join(directory, name), "utf8")),
      );
      expect(contents.join("")).not.toContain("private-setup");
      await cache.clearPrivate();
      const restored = new DiskCache(directory, cipher);
      expect(await restored.read("alice", "lineups")).toBeNull();
      expect(await restored.read("public", "feed")).toEqual({
        title: "public-setup",
      });
      const id = createHash("sha256").update("public\0feed").digest("hex");
      await writeFile(path.join(directory, `${id}.cache`), "broken json");
      expect(await restored.read("public", "feed")).toBeNull();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("evicts the least recently accessed entry within its byte budget", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "academy-lru-"));
    try {
      const cache = new DiskCache(directory, cipher, 100);
      await cache.write("public", "old", "x".repeat(40));
      await cache.write("public", "keep", "y".repeat(40));
      await cache.read("public", "keep");
      await cache.write("public", "new", "z".repeat(40));
      expect(await cache.read("public", "old")).toBeNull();
      expect(await cache.read("public", "keep")).toBe("y".repeat(40));
      expect(await cache.read("public", "new")).toBe("z".repeat(40));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("verifies a signed session offline using trusted persisted keys and rejects expired tokens", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "academy-session-"));
    try {
      const issuer = "https://trusted.clerk.accounts.dev";
      const { publicKey, privateKey } = await generateKeyPair("RS256");
      const jwk = await exportJWK(publicKey);
      jwk.kid = "test-key";
      const file = `jwks-${createHash("sha256").update(issuer).digest("hex")}.json`;
      await writeFile(
        path.join(directory, file),
        JSON.stringify({ keys: [jwk] }),
      );
      const sign = (expiry: number) =>
        new SignJWT({})
          .setProtectedHeader({ alg: "RS256", kid: "test-key" })
          .setIssuer(issuer)
          .setAudience("convex")
          .setSubject("alice")
          .setExpirationTime(expiry)
          .sign(privateKey);
      const session = new CacheSession(createTokenVerifier(issuer, directory));
      expect(() => session.scope(true)).toThrow("Sign in");
      await session.authorize(await sign(Math.floor(Date.now() / 1000) + 60));
      expect(session.scope(true)).not.toBe("public");
      await session.authorize(null);
      expect(() => session.scope(true)).toThrow("Sign in");
      await expect(session.authorize(await sign(1))).rejects.toThrow();
      expect(() => session.scope(true)).toThrow("Sign in");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not restore a session whose verification finishes after logout", async () => {
    let complete:
      ((value: { subject: string; expiresAt: number }) => void) | undefined;
    const session = new CacheSession(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = session.authorize("token");
    await session.authorize(null);
    complete!({ subject: "alice", expiresAt: Date.now() + 60000 });
    expect(await pending).toBe(false);
    expect(() => session.scope(true)).toThrow("Sign in");
  });
});
