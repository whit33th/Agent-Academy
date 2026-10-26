import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";

function detail(error: unknown) {
  const text =
    error instanceof Error ? error.stack || error.message : String(error);
  return text
    .replace(/https?:\/\/[^\s<>"']+/gi, (value) => {
      try {
        const url = new URL(value);
        url.username = "";
        url.password = "";
        url.search = "";
        url.hash = "";
        return url.toString();
      } catch {
        return "[invalid URL]";
      }
    })
    .replace(
      /\b(authorization|token|password)\s*[:=]\s*[^\r\n,]+/gi,
      "$1: [redacted]",
    )
    .slice(0, 8000);
}

export function createUpdateLog(directory: string, maxBytes = 256 * 1024) {
  const file = path.join(directory, "updates.log");
  let pending = Promise.resolve();
  return {
    write(event: string, fields: Record<string, unknown>, error?: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : undefined;
      const entry =
        JSON.stringify({
          time: new Date().toISOString(),
          event,
          ...fields,
          ...(error === undefined
            ? {}
            : {
                code: typeof code === "string" ? code : undefined,
                detail: detail(error),
              }),
        }) + "\n";
      pending = pending
        .then(async () => {
          await mkdir(directory, { recursive: true });
          const size = await stat(file)
            .then((info) => info.size)
            .catch((error: NodeJS.ErrnoException) => {
              if (error.code === "ENOENT") return 0;
              throw error;
            });
          if (size > 0 && size + Buffer.byteLength(entry) > maxBytes)
            await rename(file, file + ".1");
          await appendFile(file, entry, "utf8");
        })
        .catch(() => {
          // Diagnostic storage must never prevent an update or an app shutdown.
          console.warn("Could not write the update diagnostic log.");
        });
    },
    flush: () => pending,
  };
}
