import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";

export function clerkIssuer(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(?:test|live)_/, "");
  const host = Buffer.from(encoded, "base64")
    .toString("utf8")
    .replace(/\$$/, "");
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host) || !host.includes("."))
    throw new Error("Invalid Clerk configuration");
  return `https://${host}`;
}

export function createTokenVerifier(issuer: string, directory: string) {
  const file = path.join(
    directory,
    `jwks-${createHash("sha256").update(issuer).digest("hex")}.json`,
  );
  let keys: JSONWebKeySet | null = null;
  let lastRefresh = 0;
  let refresh: Promise<void> | null = null;

  async function loadKeys() {
    if (keys) return;
    try {
      keys = JSON.parse(await readFile(file, "utf8"));
    } catch {
      /* First online verification supplies the keys. */
    }
  }
  async function refreshKeys() {
    if (refresh) return refresh;
    if (Date.now() - lastRefresh < 30000)
      throw new Error("Session verification unavailable");
    lastRefresh = Date.now();
    refresh = (async () => {
      const response = await fetch(`${issuer}/.well-known/jwks.json`, {
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      });
      if (!response.ok) throw new Error("Session verification unavailable");
      const result: JSONWebKeySet = await response.json();
      if (!Array.isArray(result.keys) || result.keys.length > 20)
        throw new Error("Invalid session keys");
      keys = result;
      await mkdir(directory, { recursive: true });
      await writeFile(file, JSON.stringify(keys));
    })().finally(() => {
      refresh = null;
    });
    return refresh;
  }
  return async (token: string) => {
    if (token.length > 16384) throw new Error("Invalid session");
    await loadKeys();
    const verify = () =>
      jwtVerify(token, createLocalJWKSet(keys!), {
        issuer,
        audience: "convex",
        algorithms: ["RS256"],
      });
    let result;
    try {
      if (!keys) throw new Error("Missing session keys");
      result = await verify();
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        ["ERR_JWT_EXPIRED", "ERR_JWT_CLAIM_VALIDATION_FAILED"].includes(
          String(error.code),
        )
      )
        throw error;
      await refreshKeys();
      result = await verify();
    }
    if (!result.payload.sub || !result.payload.exp)
      throw new Error("Invalid session");
    return {
      subject: result.payload.sub,
      expiresAt: result.payload.exp * 1000,
    };
  };
}

export class CacheSession {
  private subject: string | null = null;
  private expiresAt = 0;
  private revision = 0;
  constructor(
    private readonly verify: (
      token: string,
    ) => Promise<{ subject: string; expiresAt: number }>,
  ) {}
  async authorize(token: string | null) {
    const revision = ++this.revision;
    if (!token) {
      this.subject = null;
      this.expiresAt = 0;
      return false;
    }
    this.subject = null;
    this.expiresAt = 0;
    const session = await this.verify(token);
    if (revision !== this.revision) return false;
    this.subject = session.subject;
    this.expiresAt = session.expiresAt;
    return this.expiresAt > Date.now();
  }
  scope(privateData: boolean) {
    if (!privateData) return "public";
    if (!this.subject || this.expiresAt <= Date.now())
      throw new Error("Sign in to access your saved private collection.");
    return createHash("sha256").update(this.subject).digest("hex");
  }
}
