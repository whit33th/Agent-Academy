import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, appendFile, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createGameState } from "../lib/desktop/game-state";
import { LogTail } from "../desktop/src/detector";
const flow = (to: string) =>
  `LogGameFlowStateManager: [PlatformTime: 1] Transitioning from Test to ${to}`;
const queue = (action: string, status = 200) =>
  `MatchmakingQueue], URL [POST https://redacted/parties/id/matchmaking/${action}], Response Code: [${status}]`;
const lock = (status = 200) =>
  `Pregame_LockCharacter URL [POST https://redacted/lock/320b2a48-4d9b-a075-30f1-1f93a9b638fa], Response Code: [${status}]`;
describe("confirmed game events", () => {
  it("handles queue cancellation without inferring match found from audio", () => {
    const state = createGameState("test");
    state.line(flow("MainMenu"));
    state.line(queue("join", 403));
    expect(state.get().phase).toBe("menu");
    state.line(queue("join"));
    expect(state.get().phase).toBe("queue");
    state.line("FXC_MatchFoundAudio");
    expect(state.get().phase).toBe("queue");
    state.line(queue("leave"));
    expect(state.get().phase).toBe("menu");
  });
  it("recognizes only successful own lock and clears agent/map between sessions", () => {
    const state = createGameState("test");
    state.line(flow("TransitionToPregame"));
    const first = state.get().sessionId;
    state.line(flow("Pregame"));
    expect(state.get().sessionId).toBe(first);
    state.line(lock(400));
    expect(state.get().agentLocked).toBe(false);
    state.line(lock());
    expect(state.get().agentSlug).toBe("sova");
    state.line(flow("TransitionToInGame"));
    state.line("LogMapLoadModel: Update: [Map Name: Jam]");
    state.line(flow("InGame"));
    expect(state.get()).toMatchObject({
      phase: "match",
      mapSlug: "lotus",
      agentSlug: "sova",
    });
    state.snapshot({
      gameRunning: true,
      sourceStatus: "ready",
      observedAt: "now",
      reason: null,
    });
    expect(state.get().phase).toBe("match");
    state.line(flow("MainMenu"));
    state.line(flow("Pregame"));
    expect(state.get().sessionId).not.toBe(first);
    expect(state.get().agentSlug).toBeNull();
    expect(state.get().mapSlug).toBeNull();
  });
  it("reads the current map token and a queue the log actually names", () => {
    const state = createGameState("test");
    state.line(
      "Party_ConvertToDefault URL [?queueID=unrated], Response Code: [200]",
    );
    state.line(queue("join"));
    expect(state.get()).toMatchObject({ phase: "queue", mode: "unrated" });
    state.line("Party_ChangeQueue], Response Code: [200]");
    expect(state.get().mode).toBeNull();
    state.line("QueryName: [Party_StartCustomGame], Response Code: [200]");
    state.line(flow("TransitionToPregame"));
    state.line(
      "LogMapLoadModel: Update: [Map Name: Rook | Changed: TRUE] [Local World: TRUE]",
    );
    state.line(
      "LogMapLoadModel: Update: [Map Name: MainMenuV2 | Changed: FALSE]",
    );
    state.line(flow("InGame"));
    expect(state.get()).toMatchObject({
      phase: "match",
      mapSlug: "corrode",
      mode: "custom",
    });
    state.line(flow("MainMenu"));
    expect(state.get()).toMatchObject({
      phase: "menu",
      mapSlug: null,
      mode: null,
    });
  });
  it("keeps unknown maps unroutable, supports late match and replay, resets on exit", () => {
    const state = createGameState("test");
    state.line(flow("InGame"));
    state.line("LogMapLoadModel: Update: [Map Name: FutureUnknownMap]");
    expect(state.get()).toMatchObject({
      phase: "match",
      mapSlug: null,
      agentSlug: null,
    });
    state.line(flow("Replay"));
    expect(state.get().phase).toBe("replay");
    expect(
      state.snapshot({
        gameRunning: false,
        sourceStatus: "ready",
        observedAt: "now",
        reason: null,
      }),
    ).toMatchObject({ phase: "unknown", sessionId: null });
  });
});
it("reads incremental UTF-8, handles truncation, replacement and missing source", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "academy-log-"));
  const file = path.join(directory, "ShooterGame.log");
  try {
    const tail = new LogTail();
    const rows: string[] = [];
    let resets = 0;
    const read = () =>
      tail.read(
        file,
        0,
        () => resets++,
        (line) => rows.push(line),
      );
    const utf8 = Buffer.from("hello Ж\n");
    await writeFile(file, utf8.subarray(0, 7));
    await read();
    expect(rows).toEqual([]);
    await appendFile(file, utf8.subarray(7));
    await read();
    expect(rows).toEqual(["hello Ж"]);
    await read();
    expect(rows).toHaveLength(1);
    await writeFile(file, "x\n");
    await read();
    expect(rows.at(-1)).toBe("x");
    await rename(file, file + ".old");
    await writeFile(file, "y\n");
    await read();
    expect(rows.at(-1)).toBe("y");
    expect(resets).toBe(3);
    await rm(file);
    await expect(read()).rejects.toMatchObject({ code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
