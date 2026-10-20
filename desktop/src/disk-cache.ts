import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

interface Entry {
  scope: string;
  bytes: number;
  accessedAt: number;
}
interface Cipher {
  encrypt(value: string): Buffer;
  decrypt(value: Buffer): string;
}

/** Owns only hashed entries under its dedicated directory; serializes mutations. */
export class DiskCache {
  private entries: Record<string, Entry> = {};
  private queue: Promise<unknown> = Promise.resolve();
  private readonly initialized: Promise<void>;

  constructor(
    private readonly directory: string,
    private readonly cipher: Cipher,
    private readonly limit = 512 * 1024 * 1024,
  ) {
    this.initialized = this.initialize().catch(() => {
      this.entries = {};
    });
  }

  private async initialize() {
    await mkdir(this.directory, { recursive: true });
    try {
      const entries: Record<string, Entry> = JSON.parse(
        await readFile(path.join(this.directory, "index.json"), "utf8"),
      );
      for (const [id, entry] of Object.entries(entries)) {
        if (
          !/^[a-f0-9]{64}$/.test(id) ||
          !entry ||
          typeof entry.scope !== "string" ||
          !Number.isFinite(entry.accessedAt)
        )
          continue;
        try {
          this.entries[id] = {
            ...entry,
            bytes: (await stat(this.file(id))).size,
          };
        } catch {
          /* Missing entry. */
        }
      }
    } catch {
      /* A damaged index is rebuilt from future reads. */
    }
    const known = new Set(Object.keys(this.entries).map((id) => `${id}.cache`));
    for (const name of await readdir(this.directory)) {
      if (/^[a-f0-9]{64}\.cache$/.test(name) && !known.has(name))
        await rm(path.join(this.directory, name), { force: true });
    }
    await this.evict();
  }

  private file(id: string) {
    return path.join(this.directory, `${id}.cache`);
  }
  private id(scope: string, key: string) {
    if (key.length > 4096 || !key.length) throw new Error("Invalid cache key");
    return createHash("sha256").update(`${scope}\0${key}`).digest("hex");
  }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => this.initialized).then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
  private async saveIndex() {
    const file = path.join(this.directory, "index.json");
    await writeFile(`${file}.tmp`, JSON.stringify(this.entries));
    await rename(`${file}.tmp`, file);
  }
  private async evict() {
    let size = Object.values(this.entries).reduce(
      (sum, entry) => sum + entry.bytes,
      0,
    );
    for (const [id, entry] of Object.entries(this.entries).sort(
      (a, b) => a[1].accessedAt - b[1].accessedAt,
    )) {
      if (size <= this.limit) break;
      await rm(this.file(id), { force: true });
      delete this.entries[id];
      size -= entry.bytes;
    }
    await this.saveIndex();
  }

  read(scope: string, key: string): Promise<unknown | null> {
    return this.serialize(async () => {
      const id = this.id(scope, key);
      if (!this.entries[id]) return null;
      try {
        const bytes = await readFile(this.file(id));
        const value = JSON.parse(
          scope === "public"
            ? bytes.toString("utf8")
            : this.cipher.decrypt(bytes),
        );
        this.entries[id].accessedAt = Date.now();
        await this.saveIndex();
        return value;
      } catch {
        delete this.entries[id];
        await rm(this.file(id), { force: true });
        await this.saveIndex();
        return null;
      }
    });
  }

  write(scope: string, key: string, value: unknown): Promise<void> {
    return this.serialize(async () => {
      const id = this.id(scope, key);
      const json = JSON.stringify(value);
      if (json === undefined || Buffer.byteLength(json) > 16 * 1024 * 1024)
        throw new Error("Cache entry is too large");
      const bytes =
        scope === "public" ? Buffer.from(json) : this.cipher.encrypt(json);
      if (bytes.length > this.limit) return;
      const file = this.file(id);
      await writeFile(`${file}.tmp`, bytes);
      await rename(`${file}.tmp`, file);
      this.entries[id] = { scope, bytes: bytes.length, accessedAt: Date.now() };
      await this.evict();
    });
  }

  clearPrivate(): Promise<void> {
    return this.serialize(async () => {
      for (const [id, entry] of Object.entries(this.entries)) {
        if (entry.scope === "public") continue;
        await rm(this.file(id), { force: true });
        delete this.entries[id];
      }
      await this.saveIndex();
    });
  }
}
