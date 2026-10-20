import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { open, stat } from "node:fs/promises";
import { StringDecoder } from "node:string_decoder";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createGameState } from "../../lib/desktop/game-state";
import { initialSnapshot, type GameSnapshot } from "../../lib/desktop/protocol";

const execute = promisify(execFile);
async function windowsGameProcess(
  signal?: AbortSignal,
): Promise<{ pid: string; startedAt: number | null } | null> {
  const system = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32");
  const { stdout } = await execute(
    path.join(system, "tasklist.exe"),
    ["/FO", "CSV", "/NH", "/FI", "IMAGENAME eq VALORANT-Win64-Shipping.exe"],
    { windowsHide: true, timeout: 6000, maxBuffer: 1024 * 1024, signal },
  );
  const pid = /^"VALORANT-Win64-Shipping\.exe","(\d+)"/im.exec(stdout)?.[1];
  if (!pid) return null;
  // An OS query only: no script file, helper service, game endpoint or game credentials.
  try {
    const { stdout: start } = await execute(
      path.join(system, "WindowsPowerShell/v1.0/powershell.exe"),
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`,
      ],
      { windowsHide: true, timeout: 6000, signal },
    );
    const startedAt = Date.parse(start.trim());
    return { pid, startedAt: Number.isFinite(startedAt) ? startedAt : null };
  } catch {
    return { pid, startedAt: null };
  }
}

export class LogTail {
  private identity = "";
  private offset = 0;
  private decoder = new StringDecoder("utf8");
  private pending = "";
  reset() {
    this.identity = "";
    this.offset = 0;
    this.decoder = new StringDecoder("utf8");
    this.pending = "";
  }
  async read(
    file: string,
    earliest: number,
    onReset: () => void,
    onLine: (line: string) => void,
  ) {
    const handle = await open(file, "r");
    try {
      const info = await handle.stat();
      const identity = `${info.dev}:${info.ino}:${info.birthtimeMs}`;
      if (identity !== this.identity || info.size < this.offset) {
        this.reset();
        this.identity = identity;
        onReset();
      }
      // A previous game session's file cannot prove the new process's phase.
      if (info.mtimeMs < earliest) return;
      const chunk = Buffer.alloc(64 * 1024);
      const end = info.size;
      while (this.offset < end) {
        const { bytesRead } = await handle.read(
          chunk,
          0,
          Math.min(chunk.length, end - this.offset),
          this.offset,
        );
        if (!bytesRead) break;
        this.offset += bytesRead;
        this.pending += this.decoder.write(chunk.subarray(0, bytesRead));
        const lines = this.pending.split(/\r?\n/);
        this.pending = lines.pop() ?? "";
        for (const line of lines) onLine(line);
        if (this.pending.length > 1024 * 1024) this.pending = "";
      }
    } finally {
      await handle.close();
    }
  }
}

export function startDetector(publish: (state: GameSnapshot) => void) {
  if (process.platform !== "win32") {
    publish({
      ...initialSnapshot(),
      sourceStatus: "unsupported",
      reason: "Windows is required.",
    });
    return () => {};
  }
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let processKey = "";
  let firstSeen = Date.now();
  const abort = new AbortController();
  let engine = createGameState(randomUUID());
  const tail = new LogTail();
  const file = path.join(
    process.env.LOCALAPPDATA ?? "",
    "VALORANT/Saved/Logs/ShooterGame.log",
  );
  async function tick() {
    let running: boolean | null = null;
    let sourceStatus: GameSnapshot["sourceStatus"] = "ready";
    let reason: string | null = null;
    try {
      const game = await windowsGameProcess(abort.signal);
      running = Boolean(game);
      const key = game ? `${game.pid}:${game.startedAt}` : "";
      if (key !== processKey) {
        processKey = key;
        firstSeen = Date.now();
        engine = createGameState(key || randomUUID());
        tail.reset();
      }
      if (game) {
        try {
          const info = await stat(file);
          const earliest =
            game.startedAt !== null ? game.startedAt - 2000 : firstSeen;
          if (info.mtimeMs < earliest) {
            sourceStatus = "initializing";
            reason = "Waiting for this game's log.";
          } else
            await tail.read(
              file,
              earliest,
              () => engine.reset(),
              (line) => {
                const date =
                  /^\[(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2}):(\d{3})\]/.exec(
                    line,
                  );
                if (!date) return;
                const [, year, month, day, hour, minute, second, ms] = date;
                if (
                  Date.UTC(
                    +year,
                    +month - 1,
                    +day,
                    +hour,
                    +minute,
                    +second,
                    +ms,
                  ) >= earliest
                )
                  engine.line(line);
              },
            );
        } catch (error) {
          sourceStatus =
            (error as NodeJS.ErrnoException).code === "ENOENT"
              ? "missing"
              : "error";
          reason =
            sourceStatus === "missing"
              ? "Game log not found."
              : "Game log cannot be read.";
        }
      }
    } catch {
      sourceStatus = "error";
      reason = "Windows process status cannot be read.";
    }
    if (!stopped) {
      publish(
        engine.snapshot({
          gameRunning: running,
          sourceStatus,
          reason,
          observedAt: new Date().toISOString(),
        }),
      );
      timer = setTimeout(() => {
        void tick();
      }, 2000);
    }
  }
  void tick();
  return () => {
    stopped = true;
    abort.abort();
    clearTimeout(timer);
  };
}
